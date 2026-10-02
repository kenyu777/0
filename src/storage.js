const STORAGE_KEY = "campus-opportunities:v1";

function createOwnerKey() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const emptyWorkspace = () => ({ ownerKey: createOwnerKey(), savedIds: [], submissions: [], blockedIds: [], blockedRecords: [], reports: [], feedbackMessages: [] });

export function readWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = emptyWorkspace();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const value = JSON.parse(raw);
    const ownerKey = typeof value.ownerKey === "string" && /^[a-f0-9-]{36}$/i.test(value.ownerKey) ? value.ownerKey : createOwnerKey();
    if (ownerKey !== value.ownerKey) localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value, ownerKey }));
    return {
      ownerKey,
      savedIds: Array.isArray(value.savedIds) ? value.savedIds.filter((id) => typeof id === "string") : [],
      submissions: Array.isArray(value.submissions) ? value.submissions.filter((item) => item && typeof item.id === "string") : [],
      blockedIds: Array.isArray(value.blockedIds) ? value.blockedIds.filter((id) => typeof id === "string") : [],
      blockedRecords: Array.isArray(value.blockedRecords) ? value.blockedRecords.filter((item) => item && typeof item.activityId === "string") : [],
      reports: Array.isArray(value.reports) ? value.reports.filter((item) => item && typeof item.id === "string") : [],
      feedbackMessages: Array.isArray(value.feedbackMessages) ? value.feedbackMessages.filter((item) => item && typeof item.id === "string") : [],
    };
  } catch {
    return emptyWorkspace();
  }
}

export function writeWorkspace(workspace) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ownerKey: workspace.ownerKey,
      savedIds: [...new Set(workspace.savedIds)],
      submissions: workspace.submissions,
      blockedIds: [...new Set(workspace.blockedIds || [])],
      blockedRecords: workspace.blockedRecords || [],
      reports: workspace.reports || [],
      feedbackMessages: workspace.feedbackMessages || [],
    }));
    return true;
  } catch {
    return false;
  }
}

export function createReport(activity, reason, note) {
  return {
    id: `report-${Date.now()}`,
    activityId: activity.id,
    activityTitle: activity.title,
    reason,
    note: note.trim(),
    createdAt: new Date().toISOString(),
    status: "待查看",
  };
}

export function createFeedbackMessage(message) {
  return {
    id: `message-${Date.now()}`,
    text: message.trim(),
    createdAt: new Date().toISOString(),
    status: "本机保存，未送达开发者",
  };
}

export function createBlockRecord(activity) {
  return {
    activityId: activity.id,
    activityTitle: activity.title,
    source: activity.source,
    createdAt: new Date().toISOString(),
  };
}

export function createStudentSubmission(formValues) {
  const createdAt = new Date().toISOString();
  return {
    id: `local-${Date.now()}`,
    title: formValues.title.trim(),
    sourceType: "student",
    source: "当前设备发布",
    category: formValues.category,
    kind: "student-post",
    start: formValues.start || null,
    deadline: null,
    location: formValues.location.trim() || "未提供",
    audience: formValues.audience.trim() || "未注明",
    body: formValues.body.trim(),
    attention: ["学生自主发布，尚未核验。参与前请自行确认活动信息。"],
    related: [],
    reviewStatus: "本地草稿",
    createdAt,
  };
}
