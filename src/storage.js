const STORAGE_KEY = "campus-opportunities:v1";

const emptyWorkspace = () => ({ savedIds: [], submissions: [] });

export function readWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyWorkspace();
    const value = JSON.parse(raw);
    return {
      savedIds: Array.isArray(value.savedIds) ? value.savedIds.filter((id) => typeof id === "string") : [],
      submissions: Array.isArray(value.submissions) ? value.submissions.filter((item) => item && typeof item.id === "string") : [],
    };
  } catch {
    return emptyWorkspace();
  }
}

export function writeWorkspace(workspace) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      savedIds: [...new Set(workspace.savedIds)],
      submissions: workspace.submissions,
    }));
    return true;
  } catch {
    return false;
  }
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
