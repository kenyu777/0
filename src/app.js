import { assessmentContext, feedbackEmail, reviewTags, seedActivities, sourceLabels } from "./data.js";
import { formatWhen, getDateRelation, getRelatedActivities, isActionNeeded, matchesActivity } from "./domain.js";
import { createBlockRecord, readWorkspace, writeWorkspace } from "./storage.js";

const state = {
  workspace: readWorkspace(),
  view: document.body.dataset.page || "all",
  category: "全部",
  source: "全部",
  query: "",
  attentionOnly: false,
  signalFilter: "全部",
  activeId: null,
  toastTimer: null,
  publicPosts: [],
  minePosts: [],
};

const selectors = {
  cards: document.querySelector("#cards-container"),
  searchSuggestions: document.querySelector("#search-suggestions"),
  empty: document.querySelector("#empty-state"),
  resultCount: document.querySelector("#result-count"),
  drawer: document.querySelector("#detail-drawer"),
  drawerContent: document.querySelector("#detail-content"),
  drawerBackdrop: document.querySelector("#drawer-backdrop"),
  publishForm: document.querySelector("#publish-form"),
  reportDialog: document.querySelector("#report-dialog"),
  reportForm: document.querySelector("#report-form"),
  toast: document.querySelector("#toast"),
};

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const pageOrder = ["all", "saved", "publish", "verify", "blocked", "reports"];
const pageByPath = new Map([
  ["/", "all"], ["/saved.html", "saved"], ["/publish.html", "publish"],
  ["/verify.html", "verify"], ["/blocked.html", "blocked"], ["/feedback.html", "reports"],
]);

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a.nav-link, a.mobile-tab, a.header-publish, a.brand");
  if (!link) return;
  const destination = new URL(link.href, window.location.href);
  const destinationView = pageByPath.get(destination.pathname);
  if (destination.origin !== window.location.origin || !destinationView || destinationView === state.view) return;

  const nav = link.closest(".primary-nav, .mobile-tabbar");
  const currentLink = nav?.querySelector(state.view === "publish" ? '[data-page-link="publish"]' : `[data-view="${state.view}"]`)
    || [...document.querySelectorAll(".nav-link.is-active, .mobile-tab.is-active, .header-publish.is-active")]
      .find((item) => item.getClientRects().length > 0);
  const currentX = currentLink?.getBoundingClientRect().left ?? pageOrder.indexOf(state.view);
  const targetX = link.matches(".brand") ? -1 : link.getBoundingClientRect().left;
  const movingForward = targetX === currentX
    ? pageOrder.indexOf(destinationView) > pageOrder.indexOf(state.view)
    : targetX > currentX;
  const enterDirection = movingForward ? "from-right" : "from-left";
  try { sessionStorage.setItem("campus-page-transition", enterDirection); } catch { /* Navigation still works if storage is unavailable. */ }
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: reader.result });
    reader.onerror = () => reject(new Error(`无法读取图片：${file.name}`));
    reader.readAsDataURL(file);
  });
}

function getActivities() {
  return [...seedActivities, ...state.publicPosts];
}

function getStatusLabel(activity) {
  const date = activity.start || activity.deadline;
  if (!date) return { label: "时间待补充", className: "state-unknown" };
  const relation = getDateRelation(date);
  if (activity.start) {
    if (relation === "past") return { label: "已开始 / 已结束", className: "state-past" };
    if (relation === "today") return { label: "今天", className: "state-today" };
    return { label: "即将开始", className: "" };
  }
  if (relation === "past") return { label: "截止已过", className: "state-past" };
  return { label: "截止待到", className: "" };
}

function hasSignal(activity, signal) {
  const tags = reviewTags[activity.id] || [];
  const joined = tags.join(" ");
  if (signal === "更新") return tags.some((tag) => ["补充通知", "补充说明", "时间变更", "招募变化"].includes(tag));
  if (signal === "缺失") return /缺失|不完整|未注明时刻/.test(joined);
  if (signal === "待核实") return /待核实|待确认|不确定/.test(joined);
  if (signal === "风险") return /风险线索|推广内容/.test(joined);
  return false;
}

function renderSummary() {
  const all = getActivities();
  document.querySelector("#total-count").textContent = String(all.length);
  document.querySelector("#attention-count").textContent = String(all.filter(isActionNeeded).length);
  document.querySelector("#saved-count").textContent = String(state.workspace.savedIds.length);
  document.querySelector("#verify-count").textContent = String(seedActivities.filter((item) => hasSignal(item, "待核实")).length);
  document.querySelectorAll(".nav-link[data-view]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.view === state.view);
    if (link.dataset.view === state.view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelectorAll(".mobile-tab[data-view]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.view === state.view);
    if (link.dataset.view === state.view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelector(".header-publish").classList.toggle("is-active", state.view === "publish");
  document.querySelector(".mobile-tab[data-page-link='publish']").classList.toggle("is-active", state.view === "publish");
}

function renderUpdateLinks() {
  const chains = [
    { original: "01", update: "09", title: "训练营 · 首场时间与地点更新" },
    { original: "03", update: "20", title: "项目招募 · 当前成员方向调整" },
  ];
  document.querySelector("#update-links").innerHTML = chains.map(({ original, update, title }) => `
    <button class="update-link" data-action="open-related" data-id="${update}">
      <b>通知 ${original} → ${update}</b><span>${escapeHtml(title)}</span>
    </button>`).join("");
}

function renderSearchSuggestions() {
  const terms = [...new Set(seedActivities.map((item) => item.category))];
  selectors.searchSuggestions.innerHTML = terms.map((term) => `
    <button class="search-suggestion" data-search-term="${escapeHtml(term)}">${escapeHtml(term)}</button>`).join("");
}

function renderSignalFilters() {
  const options = [
    { label: "全部线索", value: "全部" },
    { label: "补充通知", value: "更新" },
    { label: "信息冲突", value: "冲突", disabled: true, hint: "题目没有无法调和的原始冲突；已确认变更按补充通知展示。" },
    { label: "信息缺失", value: "缺失" },
    { label: "风险线索", value: "风险" },
  ];
  const counts = Object.fromEntries(options.map(({ value }) => [value, value === "全部" ? seedActivities.filter(isActionNeeded).length : seedActivities.filter((item) => hasSignal(item, value)).length]));
  document.querySelector("#signal-filters").innerHTML = options.map(({ label, value, disabled, hint }) => `
    <button class="signal-chip${state.signalFilter === value ? " is-active" : ""}" data-signal="${value}" ${disabled ? "disabled" : ""} ${hint ? `title="${escapeHtml(hint)}"` : ""} aria-pressed="${state.signalFilter === value}">${label}<span>${counts[value]}</span></button>`).join("");
}

function renderCard(activity) {
  const isSaved = state.workspace.savedIds.includes(activity.id);
  const status = getStatusLabel(activity);
  const dateLabel = activity.start ? `开始 ${formatWhen(activity.start)}` : activity.deadline ? `截止 ${formatWhen(activity.deadline)}` : "时间未注明";
  const note = activity.attention[0];
  const sourceClass = activity.sourceType === "student" ? "source-student" : activity.sourceType === "department" ? "source-department" : "";
  const tags = reviewTags[activity.id] || [];
  return `
    <article class="activity-card">
      <div class="card-meta">
        <span class="source-pill ${sourceClass}">${escapeHtml(sourceLabels[activity.sourceType] || "学生发布")}</span>
        <span class="category-pill">${escapeHtml(activity.category)}</span>
        ${tags.length ? `<span class="attention-pill">${escapeHtml(tags[0])}</span>` : note ? `<span class="attention-pill">需留意</span>` : ""}
        ${activity.moderationStatus ? `<span class="local-pill ${activity.moderationStatus === "approved" ? "approved-pill" : ""}">${activity.moderationStatus === "approved" ? "审核通过" : "审核中"}</span>` : ""}
        ${state.view === "blocked" ? `<button class="unblock-button" data-action="unblock" data-id="${escapeHtml(activity.id)}">取消屏蔽</button>` : `<button class="card-save${isSaved ? " is-saved" : ""}" data-action="toggle-save" data-id="${escapeHtml(activity.id)}" aria-label="${isSaved ? "取消关注" : "关注"}${escapeHtml(activity.title)}" aria-pressed="${isSaved}">${isSaved ? "♥" : "♡"}</button>`}
      </div>
      <button class="card-open" data-action="open-detail" data-id="${escapeHtml(activity.id)}">
        <h3>${escapeHtml(activity.title)}</h3>
        <p>${escapeHtml(activity.body)}</p>
      </button>
      ${activity.attachments?.length ? `<div class="activity-attachments" aria-label="活动图片">${activity.attachments.slice(0, 3).map((image) => `<img src="/uploads/${encodeURIComponent(image.id)}" alt="${escapeHtml(image.name || "活动图片")}" loading="lazy" />`).join("")}</div>` : ""}
      <div class="card-foot"><span>${escapeHtml(dateLabel)}</span><span class="date-state ${status.className}">${status.label}</span></div>
    </article>`;
}

function renderCards() {
  if (state.view === "publish") return;
  const all = getActivities();
  let list = all;
  if (state.view === "reports") return renderFeedbackEmail();
  if (state.view === "blocked") return renderBlockedHistory();
  if (state.view === "mine") return renderMineHistory();
  if (state.view === "saved") list = list.filter((item) => state.workspace.savedIds.includes(item.id) && !state.workspace.blockedIds.includes(item.id));
  if (state.view === "verify") list = list.filter((item) => hasSignal(item, "待核实") && !state.workspace.blockedIds.includes(item.id));
  if (state.view === "all") list = list.filter((item) => !state.workspace.blockedIds.includes(item.id));
  list = list.filter((item) => matchesActivity(item, {
    query: state.query,
    category: state.category,
    source: state.source,
    attentionOnly: state.attentionOnly,
  }) && (state.signalFilter === "全部" || hasSignal(item, state.signalFilter)));
  selectors.cards.innerHTML = list.map(renderCard).join("");
  selectors.empty.hidden = list.length > 0;
  selectors.cards.hidden = list.length === 0;
  document.querySelector("#list-title").textContent = ({ all: "发现适合你的机会", saved: "我的收藏", mine: "我的发布", verify: "待核实的信息" })[state.view];
  selectors.resultCount.textContent = `${list.length} 条结果`;
}

function renderMineHistory() {
  const items = [...state.minePosts].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const statusLabels = { pending: "等待审核", approved: "已公开", rejected: "未通过审核" };
  const rows = items.length ? items.map((item) => `
    <article class="history-row mine-row">
      <div class="history-icon" aria-hidden="true">${item.moderationStatus === "approved" ? "✓" : item.moderationStatus === "rejected" ? "×" : "◷"}</div>
      <div class="history-copy"><span class="eyebrow">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" }) : "刚刚提交")} · ${escapeHtml(item.reviewNote || statusLabels[item.moderationStatus] || "等待审核")}</p></div>
      <span class="moderation-state ${item.moderationStatus === "approved" ? "is-approved" : item.moderationStatus === "rejected" ? "is-rejected" : ""}">${statusLabels[item.moderationStatus] || "等待审核"}</span>
    </article>`).join("") : `<div class="management-empty"><span aria-hidden="true">✎</span><h3>还没有发布记录</h3><p>发布的信息会先进入审核队列，通过后才会公开展示。</p></div>`;
  selectors.cards.innerHTML = rows;
  selectors.cards.hidden = false;
  selectors.empty.hidden = true;
  document.querySelector("#list-title").textContent = "我的发布";
  selectors.resultCount.textContent = `${items.length} 条发布记录`;
}

function render() {
  renderSummary();
  const isHome = state.view === "all";
  document.querySelectorAll(".home-only").forEach((element) => { element.hidden = !isHome; });
  document.querySelector("#activity-list").hidden = state.view === "publish";
  document.querySelector("#publish-page").hidden = state.view !== "publish";
  renderUpdateLinks();
  renderSearchSuggestions();
  renderSignalFilters();
  renderCards();
  selectors.cards.classList.toggle("report-list", state.view === "reports");
  selectors.cards.classList.toggle("history-list", state.view === "blocked");
  selectors.cards.classList.toggle("mine-list", state.view === "mine");
  document.querySelector("#discovery-controls").hidden = ["blocked", "reports", "mine", "publish"].includes(state.view);
  document.querySelector(".section-heading .eyebrow").textContent = ({
    all: "BROWSE THE BOARD",
    saved: "SAVED OPPORTUNITIES",
    mine: "MY SUBMISSIONS",
    verify: "CHECK BEFORE YOU GO",
    blocked: "BLOCKED HISTORY",
    reports: "MESSAGE TO THE DEVELOPER",
    publish: "FROM STUDENTS",
  })[state.view];
  if (state.activeId) renderDetail();
}

function renderBlockedHistory() {
  const items = state.workspace.blockedRecords.length
    ? [...state.workspace.blockedRecords].reverse()
    : state.workspace.blockedIds.map((activityId) => {
      const activity = findActivity(activityId);
      return activity ? { activityId, activityTitle: activity.title, source: activity.source, createdAt: null } : null;
    }).filter(Boolean);
  const rows = items.length ? items.map((item) => `
    <article class="history-row">
      <div class="history-icon" aria-hidden="true">⊘</div>
      <div class="history-copy"><span class="eyebrow">屏蔽对象 · 单条信息</span><h3>${escapeHtml(item.activityTitle)}</h3><p>${escapeHtml(item.source || "学生发布")} · ${item.createdAt ? `屏蔽于 ${new Date(item.createdAt).toLocaleDateString("zh-CN")}` : "屏蔽时间未记录"}</p></div>
      <button class="button button-quiet" data-action="unblock" data-id="${escapeHtml(item.activityId)}">撤销屏蔽</button>
    </article>`).join("") : `<div class="management-empty"><span aria-hidden="true">⊘</span><h3>暂无屏蔽记录</h3><p>屏蔽的学生发布信息会保存在这里，可随时撤销。</p></div>`;
  selectors.cards.innerHTML = `<div class="history-note">题目没有提供学生账号，因此此处记录被屏蔽的单条信息，不代表屏蔽了发布者账号。</div>${rows}`;
  selectors.cards.hidden = false;
  selectors.empty.hidden = true;
  document.querySelector("#list-title").textContent = "已屏蔽";
  selectors.resultCount.textContent = `${items.length} 条历史记录`;
}

function renderFeedbackEmail() {
  const subject = encodeURIComponent("校园活动与机会 · 产品反馈");
  const body = encodeURIComponent("你好，\n\n我想反馈：\n\n");
  selectors.cards.innerHTML = `
    <section class="feedback-contact">
      <div class="feedback-email-card">
        <span class="feedback-icon" aria-hidden="true">✉</span>
        <p class="eyebrow">CONTACT THE DEVELOPER</p>
        <h3>欢迎把想法写进邮件</h3>
        <p class="feedback-description">谢谢你愿意让校园活动信息变得更清楚、更好用。每一条认真反馈，都可能帮到下一位同学。</p>
        <a class="feedback-address" href="mailto:${feedbackEmail}?subject=${subject}&body=${body}">${escapeHtml(feedbackEmail)}</a>
        <a class="button button-primary feedback-send" href="mailto:${feedbackEmail}?subject=${subject}&body=${body}">写邮件反馈 <span aria-hidden="true">↗</span></a>
        <p class="feedback-placeholder">当前邮箱为占位地址，正式使用前请替换为真实反馈邮箱。点击后会打开邮件草稿，请在邮件客户端确认并发送。</p>
      </div>
      <div class="feedback-thanks"><span aria-hidden="true">✦</span><p><strong>你的建议值得被认真对待。</strong><br />如果建议被采纳，开发者可以通过回复邮件告诉你，让这份参与感也被看见。</p></div>
    </section>`;
  selectors.cards.hidden = false;
  selectors.empty.hidden = true;
  document.querySelector("#list-title").textContent = "反馈管理";
  selectors.resultCount.textContent = "通过邮件联系开发者";
}

function findActivity(id) {
  return getActivities().find((activity) => activity.id === id);
}

function renderDetail() {
  const activity = findActivity(state.activeId);
  if (!activity) return closeDetail();
  const related = getRelatedActivities(activity, getActivities());
  const isSaved = state.workspace.savedIds.includes(activity.id);
  const notes = activity.attention.length ? `
    <section class="detail-notes" aria-labelledby="detail-notes-title">
      <h3 id="detail-notes-title">信息提示</h3>
      <ul>${activity.attention.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
    </section>` : "";
  const relatedBlock = related.length ? `
    <section class="detail-section">
      <h3>相关通知</h3>
      ${related.map((item) => `<button class="related-item" data-action="open-related" data-id="${escapeHtml(item.id)}"><span>通知 ${escapeHtml(item.id)} · ${escapeHtml(item.title)}</span><b>查看 →</b></button>`).join("")}
    </section>` : "";
  const sourceClass = activity.sourceType === "student" ? "source-student" : activity.sourceType === "department" ? "source-department" : "";
  const tags = reviewTags[activity.id] || [];
  selectors.drawerContent.innerHTML = `
    <div class="detail-meta"><span class="source-pill ${sourceClass}">${escapeHtml(sourceLabels[activity.sourceType] || "学生发布")}</span><span class="category-pill">${escapeHtml(activity.category)}</span>${tags.map((tag) => `<span class="attention-pill">${escapeHtml(tag)}</span>`).join("")}${activity.moderationStatus === "approved" ? `<span class="local-pill approved-pill">审核通过</span>` : ""}</div>
    <h2 class="detail-title" id="detail-title">${escapeHtml(activity.title)}</h2>
    <p class="detail-source">信息来源：${escapeHtml(activity.source)}${activity.id && !activity.id.startsWith("local-") ? ` · 题目材料 ${escapeHtml(activity.id)}` : ""}</p>
    <button class="button button-quiet detail-save" data-action="toggle-save" data-id="${escapeHtml(activity.id)}" aria-pressed="${isSaved}">${isSaved ? "♥ 已关注" : "♡ 关注这条信息"}</button>
    <div class="detail-moderation-actions">${activity.sourceType === "student" ? `<button class="button button-quiet" data-action="block" data-id="${escapeHtml(activity.id)}">⊘ 屏蔽此条</button>` : ""}<button class="button button-quiet" data-action="report" data-id="${escapeHtml(activity.id)}">⚑ 举报信息</button></div>
    ${notes}
    <section class="detail-section"><h3>原始信息摘要</h3><p class="detail-body">${escapeHtml(activity.body)}</p></section>
    <section class="detail-section"><h3>参与前先确认</h3><dl class="detail-facts">
      <div class="detail-fact"><dt>开始时间</dt><dd>${escapeHtml(formatWhen(activity.start))}</dd></div>
      <div class="detail-fact"><dt>截止时间</dt><dd>${escapeHtml(formatWhen(activity.deadline))}</dd></div>
      <div class="detail-fact"><dt>地点</dt><dd>${escapeHtml(activity.location || "题目未提供")}</dd></div>
      <div class="detail-fact"><dt>面向对象</dt><dd>${escapeHtml(activity.audience || "题目未提供")}</dd></div>
      <div class="detail-fact"><dt>发布来源</dt><dd>${escapeHtml(activity.source)}</dd></div>
    </dl></section>
    ${relatedBlock}
    ${activity.related?.length ? `<p class="detail-footnote">已关联原始通知与补充通知。题目没有无法调和的来源冲突；如后续出现互相矛盾的通知，应并列显示出处并等待确认。</p>` : ""}
    ${activity.moderationStatus === "approved" ? `<p class="detail-footnote">此学生发布内容已通过平台审核并公开。参与前仍建议与发布者确认最新安排。</p>` : `<p class="detail-footnote">这是考核题目中的模拟信息。来源标签说明材料来源类别，不代表平台已独立核实。</p>`}`;
}

async function loadServerPosts() {
  try {
    const [publicResponse, mineResponse] = await Promise.all([
      fetch("/api/posts", { cache: "no-store" }),
      fetch("/api/mine", { headers: { "x-owner-key": state.workspace.ownerKey }, cache: "no-store" }),
    ]);
    if (!publicResponse.ok || !mineResponse.ok) throw new Error("服务暂时不可用");
    const [publicData, mineData] = await Promise.all([publicResponse.json(), mineResponse.json()]);
    state.publicPosts = Array.isArray(publicData.posts) ? publicData.posts : [];
    state.minePosts = Array.isArray(mineData.posts) ? mineData.posts : [];
    render();
  } catch {
    showToast("服务器暂时不可用，当前只显示题目中的模拟信息。");
  }
}

function openDetail(id) {
  if (!findActivity(id)) return;
  state.activeId = id;
  renderDetail();
  selectors.drawer.inert = false;
  selectors.drawer.setAttribute("aria-hidden", "false");
  selectors.drawer.classList.add("is-open");
  selectors.drawerBackdrop.hidden = false;
  requestAnimationFrame(() => selectors.drawerBackdrop.classList.add("is-visible"));
  document.body.classList.add("drawer-open");
  selectors.drawer.querySelector("[data-action='close-detail']").focus();
}

function closeDetail() {
  state.activeId = null;
  selectors.drawer.classList.remove("is-open");
  selectors.drawer.setAttribute("aria-hidden", "true");
  selectors.drawer.inert = true;
  selectors.drawerBackdrop.classList.remove("is-visible");
  document.body.classList.remove("drawer-open");
  window.setTimeout(() => { selectors.drawerBackdrop.hidden = true; }, 230);
}

function openReport(id) {
  const activity = findActivity(id);
  if (!activity) return;
  document.querySelector("#report-target").textContent = `反馈对象：${activity.title}`;
  document.querySelector("#report-activity-id").value = activity.id;
  selectors.reportDialog.showModal();
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  selectors.toast.textContent = message;
  selectors.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => selectors.toast.classList.remove("is-visible"), 2600);
}

function toggleSaved(id) {
  const wasSaved = state.workspace.savedIds.includes(id);
  const next = {
    ...state.workspace,
    savedIds: wasSaved ? state.workspace.savedIds.filter((savedId) => savedId !== id) : [...state.workspace.savedIds, id],
  };
  if (!writeWorkspace(next)) return showToast("浏览器未允许本地存储，请检查隐私设置。");
  state.workspace = next;
  render();
  showToast(wasSaved ? "已取消关注" : "已加入我的关注");
}

function blockActivity(id) {
  const activity = findActivity(id);
  if (!activity || activity.sourceType !== "student") return;
  const next = {
    ...state.workspace,
    blockedIds: [...state.workspace.blockedIds, id],
    blockedRecords: [...state.workspace.blockedRecords, createBlockRecord(activity)],
  };
  if (!writeWorkspace(next)) return showToast("屏蔽失败，浏览器未允许本地存储。");
  state.workspace = next;
  closeDetail();
  render();
  showToast("已在当前设备屏蔽这条信息。");
}

function unblockActivity(id) {
  const next = {
    ...state.workspace,
    blockedIds: state.workspace.blockedIds.filter((blockedId) => blockedId !== id),
    blockedRecords: state.workspace.blockedRecords.filter((record) => record.activityId !== id),
  };
  if (!writeWorkspace(next)) return showToast("取消屏蔽失败，请检查浏览器存储设置。");
  state.workspace = next;
  render();
  showToast("已恢复显示这条信息。");
}

document.addEventListener("click", (event) => {
  const searchTermButton = event.target.closest("[data-search-term]");
  if (searchTermButton) {
    state.query = searchTermButton.dataset.searchTerm;
    document.querySelector("#search-input").value = state.query;
    document.querySelector(".search-suggestions").hidden = true;
    state.attentionOnly = false;
    state.source = "全部";
    document.querySelector("#source-select").value = "全部";
    return render();
  }

  const signalButton = event.target.closest("[data-signal]");
  if (signalButton && !signalButton.disabled) {
    state.signalFilter = signalButton.dataset.signal;
    return render();
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const { action, id } = actionButton.dataset;
  if (action === "open-detail" || action === "open-related") return openDetail(id);
  if (action === "toggle-save") return toggleSaved(id);
  if (action === "report") return openReport(id);
  if (action === "block") return blockActivity(id);
  if (action === "unblock") return unblockActivity(id);
  if (action === "close-report") return selectors.reportDialog.close();
  if (action === "close-detail") return closeDetail();
  if (action === "clear-filters") {
    state.category = "全部";
    state.source = "全部";
    state.query = "";
    state.attentionOnly = false;
    state.signalFilter = "全部";
    document.querySelector("#search-input").value = "";
    document.querySelector("#source-select").value = "全部";
    return render();
  }
});

document.querySelector("#search-input").addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

const searchInput = document.querySelector("#search-input");
const searchControl = document.querySelector(".search-control");
const searchSuggestionPanel = document.querySelector(".search-suggestions");
searchInput.addEventListener("focus", () => { searchSuggestionPanel.hidden = false; });
searchInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    if (!searchControl.contains(document.activeElement)) searchSuggestionPanel.hidden = true;
  }, 0);
});
searchSuggestionPanel.addEventListener("pointerdown", (event) => {
  if (event.target.closest("[data-search-term]")) event.preventDefault();
});

document.querySelector("#source-select").addEventListener("change", (event) => {
  state.source = event.target.value;
  render();
});

selectors.drawerBackdrop.addEventListener("click", closeDetail);
selectors.reportDialog.addEventListener("click", (event) => {
  if (event.target === selectors.reportDialog) selectors.reportDialog.close();
});

selectors.publishForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(selectors.publishForm);
  const values = Object.fromEntries(formData);
  delete values.images;
  const imageFiles = formData.getAll("images").filter((file) => file instanceof File && file.size > 0);
  if (imageFiles.length > 3) return showToast("最多可添加 3 张图片。");
  if (imageFiles.some((file) => file.size > 2 * 1024 * 1024)) return showToast("每张图片不能超过 2 MB。");
  if (imageFiles.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) return showToast("每次发布的图片总量不能超过 4 MB。");
  const submitButton = selectors.publishForm.querySelector("[type='submit']");
  submitButton.disabled = true;
  try {
    const attachments = await Promise.all(imageFiles.map(fileToDataUrl));
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, ownerKey: state.workspace.ownerKey, attachments }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "发布失败，请稍后重试。");
    state.minePosts = [result.post, ...state.minePosts.filter((post) => post.id !== result.post.id)];
  } catch (error) {
    submitButton.disabled = false;
    return showToast(error.message || "服务器暂时不可用，请稍后再试。");
  }
  submitButton.disabled = false;
  window.location.href = "/mine.html?submitted=1";
});

selectors.reportForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(selectors.reportForm));
  const activity = findActivity(values.activityId);
  if (!activity) return showToast("没有找到需要反馈的信息。");
  const subject = encodeURIComponent(`信息反馈：${activity.title}`);
  const body = encodeURIComponent([
    `反馈对象：${activity.title}（题目编号 ${activity.id}）`,
    `反馈原因：${values.reason}`,
    values.note.trim() ? `补充说明：${values.note.trim()}` : "",
    "",
    "（请检查邮件内容后手动发送）",
  ].filter(Boolean).join("\n"));
  selectors.reportForm.reset();
  selectors.reportDialog.close();
  closeDetail();
  showToast("邮件草稿即将打开，请确认后手动发送。");
  window.location.href = `mailto:${feedbackEmail}?subject=${subject}&body=${body}`;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.activeId && !selectors.reportDialog.open) closeDetail();
});

document.querySelector(".hero-date strong").innerHTML = `${assessmentContext.referenceLabel.match(/(\d{1,2}) 月 (\d{1,2}) 日/)?.[1] || "09"}.${assessmentContext.referenceLabel.match(/(\d{1,2}) 月 (\d{1,2}) 日/)?.[2] || "19"} <i>考核模拟时间</i>`;
render();
loadServerPosts();
if (new URLSearchParams(window.location.search).has("submitted")) showToast("已提交审核；通过后才会公开展示。");
