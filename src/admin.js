const loginPanel = document.querySelector("#admin-login-panel");
const workspace = document.querySelector("#admin-workspace");
const loginForm = document.querySelector("#admin-login-form");
const loginMessage = document.querySelector("#admin-login-message");
const postsContainer = document.querySelector("#admin-posts");
const toast = document.querySelector("#admin-toast");
let adminToken = "";
let posts = [];
let filter = "pending";
let toastTimer = null;
let imageUrls = [];

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { authorization: `Bearer ${adminToken}`, ...(options.headers || {}) },
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "请求失败，请稍后重试。");
  return result;
}

function renderPosts() {
  imageUrls.forEach((url) => URL.revokeObjectURL(url));
  imageUrls = [];
  const visible = posts.filter((post) => post.moderationStatus === filter);
  document.querySelector("#pending-count").textContent = String(posts.filter((post) => post.moderationStatus === "pending").length);
  postsContainer.innerHTML = visible.length ? visible.map((post) => `
    <article class="admin-post-card">
      <div class="admin-post-top"><span class="category-pill">${escapeHtml(post.category)}</span><time>${escapeHtml(new Date(post.createdAt).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" }))}</time></div>
      <h3>${escapeHtml(post.title)}</h3>
      <p class="admin-post-body">${escapeHtml(post.body)}</p>
      <dl class="admin-post-facts"><div><dt>开始时间</dt><dd>${escapeHtml(post.start ? new Date(post.start).toLocaleString("zh-CN") : "未填写")}</dd></div><div><dt>地点</dt><dd>${escapeHtml(post.location || "未提供")}</dd></div><div><dt>面向对象</dt><dd>${escapeHtml(post.audience || "未注明")}</dd></div></dl>
      ${post.attachments?.length ? `<div class="admin-image-gallery">${post.attachments.map((image) => `<img data-admin-image="${escapeHtml(image.id)}" alt="${escapeHtml(image.name || "待审核图片")}" loading="lazy" />`).join("")}</div>` : ""}
      ${post.reviewNote ? `<p class="admin-review-note">审核备注：${escapeHtml(post.reviewNote)}</p>` : ""}
      ${filter === "pending" ? `<label class="admin-note-label">审核备注（选填）<input data-review-note="${escapeHtml(post.id)}" maxlength="240" placeholder="例如：请补充活动地点" /></label><div class="admin-post-actions"><button class="button button-quiet reject-button" data-review="rejected" data-id="${escapeHtml(post.id)}" type="button">不通过</button><button class="button button-primary" data-review="approved" data-id="${escapeHtml(post.id)}" type="button">通过并公开</button></div>` : `<div class="admin-status ${filter}">${filter === "approved" ? "已通过并公开" : "未通过，不会公开"}</div>`}
    </article>`).join("") : `<div class="admin-empty"><span aria-hidden="true">${filter === "pending" ? "✓" : "⌕"}</span><h3>${filter === "pending" ? "审核队列暂时为空" : "这里还没有记录"}</h3><p>${filter === "pending" ? "新提交的信息会出现在这里，审核通过后才会公开。" : "提交内容进入对应状态后会保留在这里。"}</p></div>`;
  void loadAdminImages();
}

async function loadAdminImages() {
  const images = [...postsContainer.querySelectorAll("[data-admin-image]")];
  await Promise.all(images.map(async (image) => {
    try {
      const response = await fetch(`/api/admin/uploads/${encodeURIComponent(image.dataset.adminImage)}`, {
        headers: { authorization: `Bearer ${adminToken}` },
        cache: "no-store",
      });
      if (!response.ok) return;
      const objectUrl = URL.createObjectURL(await response.blob());
      imageUrls.push(objectUrl);
      if (image.isConnected) image.src = objectUrl;
      else URL.revokeObjectURL(objectUrl);
    } catch { /* The rest of the review queue remains usable when an image cannot load. */ }
  }));
}

async function loadPosts() {
  const result = await api("/api/admin/posts");
  posts = result.posts || [];
  renderPosts();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminToken = new FormData(loginForm).get("token").trim();
  loginMessage.textContent = "正在验证…";
  try {
    await loadPosts();
    loginPanel.hidden = true;
    workspace.hidden = false;
  } catch (error) {
    adminToken = "";
    loginMessage.textContent = error.message;
  }
});

document.querySelector("#refresh-queue").addEventListener("click", async () => {
  try { await loadPosts(); showToast("审核队列已刷新。"); }
  catch (error) { showToast(error.message); }
});

document.querySelector("#admin-logout").addEventListener("click", () => {
  adminToken = "";
  posts = [];
  imageUrls.forEach((url) => URL.revokeObjectURL(url));
  imageUrls = [];
  loginForm.reset();
  loginMessage.textContent = "口令只保存在当前页面内存中，关闭或刷新页面后需要重新输入。";
  workspace.hidden = true;
  loginPanel.hidden = false;
});

document.querySelectorAll(".admin-filter").forEach((button) => button.addEventListener("click", () => {
  filter = button.dataset.status;
  document.querySelectorAll(".admin-filter").forEach((item) => item.classList.toggle("is-active", item === button));
  renderPosts();
}));

postsContainer.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-review]");
  if (!button) return;
  button.disabled = true;
  const reviewNote = postsContainer.querySelector(`[data-review-note="${CSS.escape(button.dataset.id)}"]`)?.value || "";
  try {
    await api(`/api/admin/posts/${encodeURIComponent(button.dataset.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: button.dataset.review, note: reviewNote }),
    });
    await loadPosts();
    showToast(button.dataset.review === "approved" ? "已通过，内容现在会公开显示。" : "已标记为未通过，内容不会公开。");
  } catch (error) {
    button.disabled = false;
    showToast(error.message);
  }
});
