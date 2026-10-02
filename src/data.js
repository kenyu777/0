export const assessmentContext = {
  referenceTime: "2026-09-19T14:00:00+08:00",
  referenceLabel: "2026 年 9 月 19 日 14:00（考核模拟时点）",
  notice: "以下均为考核题目中的模拟信息，不代表学校真实通知。",
};

// Keep the source wording and uncertainty intact. Derived fields are limited to
// explicit dates, sources, and relationships stated in the assessment handout.
export const seedActivities = [
  {
    id: "01", title: "“蓝桥杯”程序设计校内训练营", sourceType: "school", source: "校内活动通知",
    category: "竞赛训练", kind: "activity", start: "2026-09-21T19:30:00+08:00", deadline: "2026-09-24T22:00:00+08:00",
    location: "首场地点已由补充通知调整，详见第 09 条", audience: "全校学生", body: "9 月 24 日 22:00 报名截止；原计划 9 月 20 日起每周六 19:00 训练；面向全校学生；零基础可参加。",
    attention: ["首场时间与地点已更新，查看第 09 条补充通知；报名截止时间保持不变。"], related: ["09"],
  },
  {
    id: "02", title: "AI 应用入门公开课", sourceType: "department", source: "计算机学院",
    category: "讲座分享", kind: "activity", start: "2026-09-19T19:00:00+08:00", deadline: null, location: "计算机学院教学楼", audience: "全校学生", body: "9 月 19 日 19:00；计算机学院教学楼；面向全校学生；无需报名；预计 90 分钟。",
    attention: [], related: [],
  },
  {
    id: "03", title: "大学生创新创业项目团队招募", sourceType: "school", source: "校内项目招募",
    category: "项目招募", kind: "recruitment", start: null, deadline: "2026-09-22T18:00:00+08:00", location: "未提供", audience: "招募开发、设计、材料成员", body: "每周需稳定投入 4 小时以上；9 月 22 日 18:00 截止；需提交简短自我介绍。",
    attention: ["第 20 条补充说明：开发方向名额已满，现主要补充设计与材料成员。"], related: ["20"],
  },
  {
    id: "04", title: "数学建模竞赛经验分享会", sourceType: "school", source: "校内活动通知",
    category: "讲座分享", kind: "activity", start: "2026-09-18T19:30:00+08:00", deadline: null, location: "直播", audience: "不限专业", body: "直播时间为 9 月 18 日 19:30；不限专业；直播已结束，活动方预计 9 月 20 日上传回放。",
    attention: ["直播已结束；题目仅说明活动方预计 9 月 20 日上传回放，回放是否已发布未提供。"], related: [],
  },
  {
    id: "05", title: "校园公益志愿服务活动", sourceType: "school", source: "校内活动通知",
    category: "志愿服务", kind: "activity", start: "2026-09-27T08:30:00+08:00", deadline: "2026-09-20T12:00:00+08:00", location: "未提供", audience: "未注明限制", body: "活动时间 9 月 27 日 8:30—17:00；9 月 20 日 12:00 报名截止；预计服务 8 小时；需提前到场签到。",
    attention: [], related: [],
  },
  {
    id: "06", title: "Web 开发零基础学习小组", sourceType: "school", source: "校内学习活动",
    category: "学习小组", kind: "activity", start: "2026-09-23T19:30:00+08:00", deadline: null, location: "未提供", audience: "零基础学生，限 30 人", body: "9 月 23 日起每周三 19:30 开展，共 6 周；面向零基础学生；限 30 人；报名时间未注明，满员即止。",
    attention: ["报名时间未注明；题目仅说明满员即止。"], related: [],
  },
  {
    id: "07", title: "AI 创新应用挑战赛", sourceType: "school", source: "校内竞赛通知",
    category: "竞赛训练", kind: "activity", start: null, deadline: "2026-09-21T18:00:00+08:00", location: "校内意向登记，具体地点未提供", audience: "2—4 人组队", body: "9 月 21 日 18:00 前完成校内意向登记；10 月 20 日提交作品；意向登记不等同于最终作品提交。",
    attention: ["9 月 21 日的校内意向登记与 10 月 20 日的作品提交是两个不同节点。"], related: [],
  },
  {
    id: "08", title: "校园软件项目组招募", sourceType: "school", source: "校内项目招募",
    category: "项目招募", kind: "recruitment", start: null, deadline: null, location: "未提供", audience: "大一、大二学生", body: "开发校园实用工具；希望成员了解 Git 基本操作；每周预计投入 5 小时；长期招募，满员即止。",
    attention: [], related: [],
  },
  {
    id: "09", title: "程序设计训练营补充通知", sourceType: "school", source: "训练营补充通知",
    category: "竞赛训练", kind: "update", start: "2026-09-21T19:30:00+08:00", deadline: null, location: "实验楼 A402", audience: "已报名同学及意向参与者", body: "因场地调整，首次训练改为 9 月 21 日 19:30，地点改至实验楼 A402；已报名同学无需重复提交；报名截止时间不变。",
    attention: ["这是第 01 条训练营通知的更新：只调整首次训练时间和地点，报名截止时间不变。"], related: ["01"],
  },
  {
    id: "10", title: "前端开发经验交流会", sourceType: "school", source: "校内活动通知",
    category: "讲座分享", kind: "activity", start: "2026-09-19T15:00:00+08:00", deadline: null, location: "线下 A201，同步线上直播", audience: "未注明限制", body: "9 月 19 日 15:00—16:30；线下 A201 并同步线上直播；无需报名。",
    attention: [], related: [],
  },
  {
    id: "11", title: "大学生科研入门分享会", sourceType: "school", source: "校内活动通知",
    category: "讲座分享", kind: "activity", start: "2026-09-21T19:00:00+08:00", deadline: null, location: "未提供", audience: "全校学生", body: "9 月 21 日 19:00—20:30；介绍论文检索、学生科研项目和导师联系方法；面向全校学生。",
    attention: [], related: [],
  },
  {
    id: "12", title: "全国高校计算机能力挑战赛", sourceType: "school", source: "赛事通知",
    category: "竞赛训练", kind: "activity", start: null, deadline: "2026-10-05T23:59:00+08:00", location: "未提供", audience: "本科生，个人参赛", body: "面向本科生；10 月 5 日 23:59 报名截止；个人参赛；具体费用信息未提供。",
    attention: ["具体费用信息未提供，不能据此判断是否收费。"], related: [],
  },
  {
    id: "13", title: "科研助理招募", sourceType: "school", source: "校内招募通知",
    category: "项目招募", kind: "recruitment", start: null, deadline: "2026-09-21", location: "未提供", audience: "仅限大二及以上学生", body: "协助数据整理和实验工作；仅限大二及以上学生；每周预计投入 6 小时；9 月 21 日截止报名。",
    attention: [], related: [],
  },
  {
    id: "14", title: "Git 与 GitHub 零基础工作坊", sourceType: "school", source: "校内活动通知",
    category: "学习小组", kind: "activity", start: "2026-09-21T19:00:00+08:00", deadline: null, location: "未提供", audience: "主要面向大一新生，限 40 人", body: "9 月 21 日 19:00—20:30；主要面向大一新生；限 40 人；需提前预约，提交报名表不代表最终录取，以审核通知为准。",
    attention: ["预约并提交报名表不代表最终录取，以审核通知为准。"], related: [],
  },
  {
    id: "15", title: "AI 应用创意挑战", sourceType: "school", source: "校内竞赛通知",
    category: "竞赛训练", kind: "activity", start: null, deadline: "2026-09-23T23:59:00+08:00", location: "未提供", audience: "个人或团队均可参加", body: "9 月 23 日 23:59 前提交创意方案；9 月 30 日前提交最终作品；允许个人或团队参加；进入展示环节后可再组队。",
    attention: ["创意方案与最终作品有不同截止时间；题目说明 9 月 30 日前提交最终作品。"], related: [],
  },
  {
    id: "16", title: "校园摄影志愿者招募", sourceType: "school", source: "校内招募通知",
    category: "志愿服务", kind: "recruitment", start: null, deadline: null, location: "校内大型活动现场", audience: "未注明限制；有摄影设备者优先但非硬性要求", body: "长期招募；参与校内大型活动摄影；具体报名截止时间未注明；有摄影设备者优先但不作硬性要求。",
    attention: ["具体报名截止时间未注明；设备要求为优先条件，不是硬性要求。"], related: [],
  },
  {
    id: "17", title: "Python 程序设计学习资料合集", sourceType: "school", source: "学习资料通知",
    category: "学习资料", kind: "resource", start: null, deadline: "2026-09-22", location: "网盘；提取信息未提供", audience: "未注明限制", body: "包含课程、练习和项目案例；资料长期开放；当前网盘提取信息有效至 9 月 22 日，后续将统一更新。",
    attention: ["资料长期开放，但当前网盘提取信息有效期至 9 月 22 日；后续会统一更新。"], related: [],
  },
  {
    id: "18", title: "网络安全兴趣交流小组", sourceType: "school", source: "校内兴趣活动",
    category: "学习小组", kind: "activity", start: "2026-09-19T19:30:00+08:00", deadline: null, location: "未提供", audience: "对 CTF、Web 安全等方向感兴趣的学生，不限基础", body: "首次交流时间为 9 月 19 日 19:30；之后每两周开展一次；面向 CTF、Web 安全等方向感兴趣的学生；不限基础。",
    attention: [], related: [],
  },
  {
    id: "19", title: "学生创新项目路演观摩", sourceType: "school", source: "校内活动通知",
    category: "讲座分享", kind: "activity", start: "2026-09-20T14:30:00+08:00", deadline: "2026-09-18T22:00:00+08:00", location: "未提供", audience: "未注明限制", body: "活动时间 9 月 20 日 14:30；原报名截止时间为 9 月 18 日 22:00；活动方说明如现场仍有余位，可接受候补入场。",
    attention: ["原报名截止时间已过；题目说明如现场仍有余位可候补入场，但没有保证名额。"], related: [],
  },
  {
    id: "20", title: "创新创业项目团队补充说明", sourceType: "school", source: "项目招募补充说明",
    category: "项目招募", kind: "update", start: null, deadline: "2026-09-22T18:00:00+08:00", location: "未提供", audience: "现主要补充设计与材料成员", body: "开发方向名额已满，现主要补充设计与材料成员；9 月 22 日 18:00 截止；此前已投递者无需重复提交。",
    attention: ["这是第 03 条团队招募的补充说明：开发方向已满，需求转为设计与材料成员。"], related: ["03"],
  },
  {
    id: "21", title: "计算机学院 AI 产品设计分享会", sourceType: "department", source: "计算机学院",
    category: "讲座分享", kind: "activity", start: "2026-09-20T19:00:00+08:00", deadline: null, location: "明德楼 B203", audience: "全校学生", body: "计算机学院发布；9 月 20 日 19:00；明德楼 B203；面向全校学生；无需报名，座位有限。",
    attention: ["无需报名，但座位有限。"], related: [],
  },
  {
    id: "22", title: "周末羽毛球约球", sourceType: "student", source: "学生个人发布",
    category: "运动社交", kind: "student-post", start: "2026-09-20T16:00:00+08:00", deadline: null, location: "场地待最终确认", audience: "计划 6—8 人", body: "学生个人发布；9 月 20 日 16:00；计划 6—8 人；费用 AA；场地待最终确认。",
    attention: ["场地尚待最终确认。"], related: [],
  },
  {
    id: "23", title: "AI 工具交流搭子招募", sourceType: "student", source: "学生个人发布",
    category: "兴趣交流", kind: "student-post", start: "2026-09-21", deadline: null, location: "具体地点未确定", audience: "欢迎零基础", body: "拟于 9 月 21 日晚开展；欢迎零基础；报名后拉群；具体地点未确定。",
    attention: ["具体地点未确定；题目只说明 9 月 21 日晚，未提供具体开始时间。"], related: [],
  },
  {
    id: "24", title: "“校园兼职福利分享”", sourceType: "student", source: "学生个人发布",
    category: "学生发布", kind: "student-post", start: null, deadline: null, location: "未提供", audience: "未提供", body: "学生个人发布；称“零门槛、日结”，要求添加私人微信获取详情；未提供主办方、地点和完整内容。",
    attention: ["发布方、地点和完整内容均未提供；要求添加私人微信获取详情。题目未核实其真实性。"], related: [],
  },
  {
    id: "25", title: "数码新品体验交流", sourceType: "student", source: "学生个人发布",
    category: "学生发布", kind: "student-post", start: null, deadline: null, location: "未提供", audience: "未提供", body: "学生个人发布；标题为技术交流，正文主要介绍某商家优惠及购买链接；活动时间、地点未注明。",
    attention: ["正文主要介绍商家优惠及购买链接，活动时间、地点未注明；可先核实活动内容再参与。"], related: [],
  },
  {
    id: "26", title: "外国语学院校园语言角", sourceType: "department", source: "外国语学院",
    category: "讲座分享", kind: "activity", start: "2026-09-21T15:00:00+08:00", deadline: null, location: "未提供", audience: "全校学生", body: "外国语学院发布；9 月 21 日 15:00；面向全校学生；自由交流；场地容量有限，无需提前报名。",
    attention: ["无需提前报名，但场地容量有限。"], related: [],
  },
];

export const sourceLabels = {
  school: "校内信息",
  department: "学院发布",
  student: "学生发布",
};

// Placeholder only; replace before sharing the product with real users.
export const feedbackEmail = "xxx@xxx.com";

// Classification is a prompt for careful reading, not a claim that an item is false.
// No item in the prompt contains an unresolved, authoritative contradiction; the
// known differences are explicit supplements and should be compared as revisions.
export const reviewTags = {
  "01": ["补充通知", "时间变更"],
  "03": ["补充说明", "招募变化"],
  "04": ["结果待核实"],
  "05": ["报名截止提醒"],
  "06": ["报名时间缺失"],
  "07": ["阶段区分"],
  "09": ["补充通知", "时间变更"],
  "12": ["费用缺失"],
  "13": ["截止时间未注明时刻"],
  "14": ["录取待确认"],
  "15": ["阶段区分", "最终截止日期未注明时刻"],
  "16": ["报名截止时间缺失"],
  "17": ["资料有效期提醒"],
  "19": ["截止已过", "候补不确定"],
  "20": ["补充说明", "招募变化"],
  "21": ["名额有限"],
  "22": ["地点待确认"],
  "23": ["时间与地点不完整"],
  "24": ["内容待核实", "风险线索"],
  "25": ["信息不完整", "推广内容待核实"],
  "26": ["场地容量提醒"],
};
