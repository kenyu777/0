import { assessmentContext, seedActivities } from "./data.js";

export function getAllActivities(workspace) {
  return [...seedActivities, ...workspace.submissions];
}

export function isActionNeeded(activity) {
  return activity.attention.length > 0;
}

export function matchesActivity(activity, { query = "", category = "全部", source = "全部", attentionOnly = false } = {}) {
  const needle = query.trim().toLocaleLowerCase("zh-CN");
  const text = [activity.title, activity.source, activity.category, activity.audience, activity.location, activity.body, ...activity.attention]
    .join(" ")
    .toLocaleLowerCase("zh-CN");
  return (!needle || text.includes(needle))
    && (category === "全部" || activity.category === category)
    && (source === "全部" || activity.sourceType === source)
    && (!attentionOnly || isActionNeeded(activity));
}

export function formatWhen(value) {
  if (!value) return "题目未提供";
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  return hour ? `${Number(month)} 月 ${Number(day)} 日 ${hour}:${minute}` : `${Number(month)} 月 ${Number(day)} 日（时间未注明）`;
}

export function getDateRelation(value) {
  if (!value) return "unknown";
  const referenceDate = assessmentContext.referenceTime.slice(0, 10);
  const date = value.slice(0, 10);
  if (date < referenceDate) return "past";
  if (date > referenceDate) return "upcoming";
  if (value.length === 10) return "today";
  return value <= assessmentContext.referenceTime ? "past" : "today";
}

export function getRelatedActivities(activity, allActivities) {
  return activity.related.map((id) => allActivities.find((candidate) => candidate.id === id)).filter(Boolean);
}
