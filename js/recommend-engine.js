
/* 今天该吃什么？推荐引擎
   数据来源：今天该吃什么_最终标签数据库.xlsx 导出的 FOOD_ITEMS / BUILDINGS。
   设计原则：不做“概率猜测”，而是用用户状态 → 标签/数值范围 → 加权排序。
*/

window.STATE_GROUPS = [
  {
    id: "body",
    title: "此刻我的身体状态是：",
    multi: true,
    options: [
      { id: "fat_loss", label: "减脂中...", emoji: "🥗" },
      { id: "stomach_easy", label: "胃想舒服一点", emoji: "🍲" },
      { id: "tired", label: "好累呀", emoji: "🌙" },
      { id: "hot_food", label: "想吃热乎的", emoji: "♨️" },
      { id: "sweet", label: "想吃甜的", emoji: "🍰" },
      { id: "spicy", label: "想吃重口味", emoji: "🌶️" }
    ]
  },
  {
    id: "hunger",
    title: "此刻我的饱食度：",
    multi: false,
    options: [
      { id: "light", label: "不太饿，垫点好了", emoji: "🍵" },
      { id: "normal", label: "正常吃一顿", emoji: "🍚" },
      { id: "very_hungry", label: "超级饿", emoji: "🍜" }
    ]
  },
  {
    id: "scene",
    title: "吃饭场景：",
    multi: false,
    options: [
      { id: "solo", label: "独自享用美食", emoji: "🧸" },
      { id: "friends", label: "和友人一起", emoji: "👭" },
      { id: "hurry", label: "时间赶，我得赶快吃完", emoji: "⏱️" },
      { id: "study_break", label: "学习间隙点心一下", emoji: "📚" },
      { id: "date_treat", label: "可以慢慢品鉴", emoji: "🌷" }
    ]
  },
  {
    id: "budget",
    title: "我的预算：",
    multi: false,
    options: [
      { id: "canteen_15_25", label: "食堂正常吃点 15–25元", emoji: "🍚" },
      { id: "extra_25_50", label: "食堂豪华餐 / 试试校外 25–50元", emoji: "🥘" },
      { id: "reward_50_plus", label: "犒劳自己一顿！ 50元以上", emoji: "🍽️" },
      { id: "campus_drink_20", label: "校内饮品 20元以内", emoji: "🧃" },
      { id: "tea_25_50", label: "喝杯精致下午茶 25–50元", emoji: "☕" }
    ]
  },
  {
    id: "preference",
    title: "我最想吃：",
    multi: true,
    options: [
      { id: "rice", label: "想吃大米饭！", emoji: "🍛" },
      { id: "noodles", label: "想嗦面嗦粉了", emoji: "🍜" },
      { id: "soup", label: "想喝汤、粥", emoji: "🥣" },
      { id: "vegetable", label: "多点蔬菜", emoji: "🥬" },
      { id: "halal", label: "清真优先", emoji: "🌙" },
      { id: "meat_more", label: "肉多多！！", emoji: "🥩" },
      { id: "drink", label: "只想喝点东西", emoji: "🥤" }
    ]
  },
  {
    id: "time",
    title: "现在准备吃：",
    multi: false,
    options: [
      { id: "lunch", label: "午餐", emoji: "☀️" },
      { id: "dinner", label: "晚餐", emoji: "🌆" },
      { id: "afternoon", label: "下午茶", emoji: "🫖" },
      { id: "night", label: "夜宵", emoji: "🌙" }
    ]
  }
];

window.DEFAULT_WEIGHTS = {
  body: 30,
  hunger: 20,
  scene: 10,
  distance: 10,
  budget: 10,
  preference: 10,
  novelty: 5
};

window.STATE_RULES = {
  fat_loss: {
    label: "减脂 / 低负担",
    ranges: { spicy: [0, 2], oil: [1, 2], fullness: [2, 4] },
    prefer: ["低负担", "蔬菜", "素菜", "高蛋白", "清淡", "轻食"],
    exclude: ["高油风险", "高糖风险", "炸物", "油炸", "奶油"]
  },
  stomach_easy: {
    label: "胃想舒服点",
    ranges: { spicy: [0, 1], oil: [1, 2], fullness: [2, 4] },
    prefer: ["清淡", "暖胃", "稳妥", "汤", "粥", "热乎", "鲜香"],
    exclude: ["麻辣", "香辣", "刺激", "重油", "高油风险"]
  },
  tired: {
    label: "今天有点累",
    ranges: { fullness: [2, 5] },
    prefer: ["安慰型", "治愈", "暖胃", "满足感强", "提神", "稳妥"],
    exclude: []
  },
  hot_food: {
    label: "想吃热乎的",
    ranges: { fullness: [2, 5] },
    prefer: ["热乎", "暖胃", "汤", "粥", "面", "粉", "麻辣烫", "热菜"],
    exclude: ["冷食", "冰", "凉菜"]
  },
  sweet: {
    label: "想吃点甜的",
    ranges: { fullness: [1, 3] },
    prefer: ["甜口", "甜品", "奶香", "咖啡", "下午茶", "安慰型", "治愈", "奖励自己"],
    exclude: []
  },
  spicy: {
    label: "想吃重口味",
    ranges: { spicy: [3, 5], oil: [2, 5] },
    prefer: ["麻辣", "香辣", "重口", "解馋", "满足感强", "油香", "烤香"],
    exclude: []
  },
  light: {
    label: "不太饿",
    ranges: { fullness: [1, 2] },
    prefer: ["不太饿", "下午茶", "学习间隙", "饮品", "甜品", "小吃", "轻食"],
    exclude: []
  },
  normal: {
    label: "正常吃一顿",
    ranges: { fullness: [3, 4] },
    prefer: ["一人食", "工作餐", "日常", "稳妥", "套餐", "盖饭", "面"],
    exclude: []
  },
  very_hungry: {
    label: "特别饿",
    ranges: { fullness: [4, 5] },
    prefer: ["很饿", "高碳水", "高蛋白", "米饭", "面条", "套餐", "饱腹", "满足感强"],
    exclude: []
  },
  solo: {
    label: "一个人吃",
    prefer: ["一人食", "一个人", "工作餐", "单份主食", "套餐", "赶时间"],
    exclude: []
  },
  friends: {
    label: "和朋友一起",
    prefer: ["朋友聚餐", "多人", "正式聚餐", "围坐", "餐厅级推荐", "分享"],
    exclude: []
  },
  hurry: {
    label: "赶时间",
    prefer: ["赶时间", "出餐快", "单份主食", "套餐", "工作餐"],
    exclude: []
  },
  study_break: {
    label: "学习间隙",
    prefer: ["学习间隙", "下午茶", "休闲小憩", "饮品", "提神", "甜品"],
    exclude: []
  },
  date_treat: {
    label: "想坐下慢慢吃",
    prefer: ["正式聚餐", "朋友聚餐", "愿意专门去吃", "有仪式感", "餐厅级推荐", "奖励自己"],
    exclude: []
  },
  rice: {
    label: "想吃米饭/盖饭",
    prefer: ["米饭", "盖饭", "套餐", "热菜", "炒菜"],
    exclude: []
  },
  noodles: {
    label: "想吃面/粉",
    prefer: ["面条", "粉", "面食", "米线", "刀削面", "粉面"],
    exclude: []
  },
  soup: {
    label: "想喝汤/粥",
    prefer: ["汤", "粥", "炖汤", "暖胃", "清淡"],
    exclude: []
  },
  vegetable: {
    label: "多点蔬菜",
    prefer: ["蔬菜", "素菜", "低负担", "健康", "清淡"],
    exclude: ["高油风险"]
  },
  halal: {
    label: "清真优先",
    prefer: ["清真", "民族餐厅"],
    exclude: ["猪肉", "含猪"]
  },
  meat_more: {
    label: "肉多多！！",
    prefer: ["肉", "鸡", "牛", "羊", "鸭", "鱼", "虾", "蛋", "排骨", "鸡腿", "肥牛", "牛肉", "羊肉", "高蛋白", "烤肉"],
    exclude: []
  },
  drink: {
    label: "只想喝点东西",
    ranges: { fullness: [1, 2] },
    prefer: ["饮品", "咖啡", "茶饮", "奶茶", "果汁", "提神"],
    exclude: []
  },
  lunch: {
    label: "午餐 11:00–13:30",
    prefer: ["午餐", "工作餐", "套餐", "盖饭", "米饭", "面"],
    exclude: []
  },
  dinner: {
    label: "晚餐 17:30–20:00",
    prefer: ["晚餐", "热菜", "汤", "面", "米饭", "聚餐"],
    exclude: []
  },
  afternoon: {
    label: "下午茶",
    ranges: { fullness: [1, 3] },
    prefer: ["下午茶", "甜品", "饮品", "咖啡", "学习间隙", "休闲小憩"],
    exclude: []
  },
  night: {
    label: "夜宵 21:00以后",
    prefer: ["夜宵", "小吃", "粉面", "热乎", "解馋"],
    exclude: []
  }
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function itemText(item) {
  if (item && item.isCombo && Array.isArray(item.items)) {
    return [item.name, item.comboNote, ...item.items.map(part => itemText(part))].join(" ");
  }
  return [
    item.name, item.venue, item.area, item.floor, item.note, item.foodType, item.staple,
    item.protein, item.taste, item.health, item.mood, item.scene, item.priceLevel,
    item.timeTag, item.granularity, item.orderLogic, item.manualNote, item.searchText
  ].join(" ");
}

function containsAny(text, keywords) {
  if (!keywords || keywords.length === 0) return false;
  return keywords.some(k => k && text.includes(k));
}


function readUserFoodItems() {
  try {
    const raw = JSON.parse(localStorage.getItem("userFoodItems") || "[]");
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

function allFoodItems() {
  return [...(window.FOOD_ITEMS || []), ...readUserFoodItems()];
}

function inferFoodTagsFromText(text) {
  const t = String(text || "");
  if (containsAny(t, ["咖啡", "奶茶", "茶", "饮品", "果汁", "豆浆", "酸梅汤", "柠檬茶"])) {
    return { foodType: "饮品类", staple: "不明显", scene: "学习间隙;下午茶", mood: "提神;休闲小憩" };
  }
  if (containsAny(t, ["米饭", "盖饭", "拌饭", "炒饭", "煲仔饭", "饭"]) && !containsAny(t, ["米线"])) {
    return { foodType: "米饭/盖饭类", staple: "米饭", scene: "正常吃一顿;赶时间", mood: "稳妥;满足感强" };
  }
  if (containsAny(t, ["面", "粉", "米线", "刀削面", "热干面", "烩面", "馄饨", "水饺", "饺子", "包子", "馒头", "饼"])) {
    return { foodType: "面食/粉面类", staple: "面条", scene: "正常吃一顿;想吃热乎的", mood: "暖胃;稳妥" };
  }
  if (containsAny(t, ["汤", "粥", "羹", "炖"])) {
    return { foodType: "汤粥类", staple: "粥", scene: "想吃热乎的", mood: "暖胃;低负担" };
  }
  if (containsAny(t, ["沙拉", "蔬菜", "青菜", "白菜", "豆腐", "玉米", "菌菇", "土豆", "茄子"])) {
    return { foodType: "素菜/蔬菜类", staple: "需搭配主食", scene: "正常吃一顿", mood: "清爽;低负担" };
  }
  return { foodType: "用户补充", staple: "不明显", scene: "正常吃一顿", mood: "用户补充;待尝试" };
}

function saveUserFoodItem(input = {}) {
  const now = Date.now();
  const name = String(input.name || "").trim();
  const venue = String(input.venue || "").trim();
  if (!name && !venue) return null;
  const text = [name, venue, input.area, input.note, input.foodType].join(" ");
  const inferred = inferFoodTagsFromText(text);
  const price = Number(input.price || 0);
  const item = {
    id: `user-${now}`,
    userAdded: true,
    type: input.type === "mall" ? "mall" : "canteen",
    area: String(input.area || "用户补充").trim() || "用户补充",
    floor: String(input.floor || "").trim(),
    venue,
    note: String(input.note || "").trim(),
    name: name || venue || "用户补充项目",
    priceText: price > 0 ? `${price}元` : String(input.priceText || "价格待核实"),
    price: price > 0 ? price : 0,
    unit: price > 0 ? "元" : "",
    businessHours: String(input.businessHours || "用户补充，需现场确认").trim(),
    granularity: "用户补充记录",
    orderLogic: "由用户补充，推荐时仅作参考",
    foodType: String(input.foodType || inferred.foodType).trim() || inferred.foodType,
    staple: String(input.staple || inferred.staple).trim() || inferred.staple,
    protein: String(input.protein || "未填写").trim(),
    taste: String(input.taste || "未填写").trim(),
    spicy: Number(input.spicy || 0),
    oil: Number(input.oil || 3),
    fullness: Number(input.fullness || 3),
    health: String(input.health || "用户补充").trim(),
    mood: String(input.mood || inferred.mood).trim(),
    scene: String(input.scene || inferred.scene).trim(),
    priceLevel: price > 0 && price <= 20 ? "低预算" : (price > 0 && price <= 50 ? "普通预算" : "预算待确认"),
    timeTag: String(input.timeTag || "午餐;晚餐;下午茶;夜宵").trim(),
    containsPork: String(input.containsPork || "未填写").trim(),
    halal: String(input.halal || "未填写").trim(),
    singleMeal: "用户补充",
    manualNote: "用户补充记录",
    searchText: [name, venue, input.area, input.note, inferred.foodType, inferred.staple].filter(Boolean).join(" ")
  };
  const old = readUserFoodItems();
  old.unshift(item);
  localStorage.setItem("userFoodItems", JSON.stringify(old.slice(0, 300)));
  return item;
}

function deleteUserFoodItem(id) {
  const next = readUserFoodItems().filter(x => x.id !== id);
  localStorage.setItem("userFoodItems", JSON.stringify(next));
}

const HARD_PREFERENCE_IDS = ["rice", "noodles", "soup", "drink"];

function selectedHardPreferences(state = {}) {
  return (Array.isArray(state.preference) ? state.preference : []).filter(id => HARD_PREFERENCE_IDS.includes(id));
}

function isFatLossState(state = {}) {
  return Array.isArray(state.body) && state.body.includes("fat_loss");
}

function isDrinkItem(item) {
  const name = String(item.name || "");
  const foodType = String(item.foodType || "");
  const note = String(item.note || "");
  const granularity = String(item.granularity || "");
  const text = [name, foodType, note, granularity].join(" ");
  const strongDrinkWords = ["饮品", "饮料", "咖啡", "茶饮", "奶茶", "果汁", "豆浆", "酸梅汤", "柠檬茶", "冷泡茶", "鲜蔬饮品", "拿铁", "美式", "冷萃", "冰沙", "奶昔", "可乐", "雪碧", "北冰洋", "农夫山泉", "红茶", "绿茶", "乌龙", "杏皮水", "花生露", "梨汤", "炖奶"];
  const mealWords = ["饭", "面", "粉", "米线", "河粉", "饼", "包", "馒头", "饺", "馄饨", "三明治", "汉堡", "披萨", "蛋糕", "球", "串", "烤", "炸", "鸡", "牛", "羊", "鸭", "鱼", "肉", "沙拉", "套餐", "寿司", "便当"];
  const nameLooksDrink = containsAny(name, strongDrinkWords);
  if (containsAny(name, mealWords) && !nameLooksDrink) return false;
  return nameLooksDrink || containsAny(foodType, ["饮品", "咖啡", "茶饮"]);
}

function isRiceItem(item) {
  const name = String(item.name || "");
  const text = itemText(item);
  if (containsAny(text, ["米饭/盖饭", "米饭", "盖饭", "拌饭", "炒饭", "煲仔饭", "鸡油饭", "紫米饭", "白米饭", "一两米饭"])) return true;
  return /(^|[^米])饭/.test(name) && !name.includes("米线");
}

function isNoodleItem(item) {
  const text = itemText(item);
  return containsAny(text, ["面条", "面食", "粉面", "米线", "刀削面", "热干面", "烩面", "拌面", "汤粉", "河粉", "米粉", "馄饨", "水饺", "饺子", "包子", "馒头", "面皮", "卷饼", "煎饼"]);
}

function isSoupItem(item) {
  const text = itemText(item);
  return containsAny(text, ["汤", "粥", "羹", "炖汤", "暖胃"]);
}

function matchesHardPreference(item, id) {
  if (id === "rice") return isRiceItem(item);
  if (id === "noodles") return isNoodleItem(item);
  if (id === "soup") return isSoupItem(item);
  if (id === "vegetable") return isVegetableDish(item);
  if (id === "drink") return isDrinkItem(item);
  return true;
}

function categoryPreferenceMismatch(item, state = {}) {
  const prefs = selectedHardPreferences(state);
  if (!prefs.length) return "";
  if (prefs.some(id => matchesHardPreference(item, id))) return "";
  const labels = prefs.map(id => (window.STATE_RULES[id] || {}).label || id).join(" / ");
  return `不在已选择的「${labels}」范围内`;
}

function hasCompleteStaple(item) {
  if (!item || item.isCombo) return true;
  const name = String(item.name || "");
  const staple = String(item.staple || "");
  const text = itemText(item);
  if (containsAny(staple, ["需搭配主食", "不明显"])) return false;
  if (containsAny(staple, ["米饭", "面条", "面皮", "粥", "粉", "米线", "馒头", "包子", "饺子", "馄饨", "饼"])) return true;
  if (containsAny(text, ["米饭/盖饭类", "面食类", "粉面类", "汤粥类", "饺子包子馄饨类"])) return true;
  if (containsAny(name, ["饭", "面", "米线", "米粉", "河粉", "粉丝", "粥", "馄饨", "水饺", "饺子", "包子", "馒头", "卷饼", "煎饼", "烧饼", "肠粉"])) return true;
  return false;
}

function canteenNeedsStaple(item) {
  if (!item || item.type !== "canteen" || item.isCombo) return false;
  if (isDrinkItem(item)) return false;
  if (hasCompleteStaple(item)) return false;
  return true;
}

function isFatLossProteinStandalone(item, state = {}) {
  if (!isFatLossState(state)) return false;
  if (!item || item.type !== "canteen" || item.isCombo) return false;
  if (hasCompleteStaple(item)) return false;
  const text = itemText(item);
  const price = Number(item.price || 0);
  const oil = Number(item.oil || 0);
  const fullness = Number(item.fullness || 0);
  if (containsAny(text, ["加购", "小料", "单加", "饮品", "甜品", "主食搭配"])) return false;
  return isProteinDish(item) && price >= 4 && fullness >= 3 && oil > 0 && oil <= 3;
}


const MEAL_TIME_WINDOWS = {
  lunch: { label: "午餐", start: 11 * 60, end: 13 * 60 + 30, tag: "午餐" },
  afternoon: { label: "下午茶", start: 13 * 60 + 30, end: 17 * 60 + 30, tag: "下午茶" },
  dinner: { label: "晚餐", start: 17 * 60 + 30, end: 20 * 60, tag: "晚餐" },
  night: { label: "夜宵", start: 21 * 60, end: 24 * 60, tag: "夜宵" }
};

function normalizeBusinessHours(text) {
  return String(text || "")
    .replace(/：/g, ":")
    .replace(/[—–－~～至]/g, "-")
    .replace(/晚/g, " 晚")
    .replace(/午/g, " 午")
    .replace(/早/g, " 早")
    .replace(/；/g, ";")
    .replace(/，/g, ",")
    .trim();
}

function parseClockToMinutes(h, m) {
  let hour = Number(h);
  let minute = Number(m || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (minute >= 60) minute = 59;
  if (hour < 0) hour = 0;
  if (hour > 24) hour = 24;
  return hour * 60 + minute;
}

function parseBusinessHourRanges(text) {
  const source = normalizeBusinessHours(text);
  if (!source) return [];
  const ranges = [];
  const re = /(\d{1,2})\s*:\s*(\d{1,2})\s*-\s*(\d{1,2})\s*:\s*(\d{1,2})/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const start = parseClockToMinutes(m[1], m[2]);
    let end = parseClockToMinutes(m[3], m[4]);
    if (start === null || end === null) continue;
    if (end <= start) end += 24 * 60;
    ranges.push({ start, end });
  }
  return ranges;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function itemAvailableForSelectedTime(item, timeId) {
  const windowDef = MEAL_TIME_WINDOWS[timeId];
  if (!windowDef) return { ok: true, reason: "" };

  const hoursText = String(item.businessHours || "").trim();
  const tagText = String(item.timeTag || "");
  const ranges = parseBusinessHourRanges(hoursText);

  if (ranges.length) {
    const ok = ranges.some(r => rangesOverlap(r.start, r.end, windowDef.start, windowDef.end));
    return ok
      ? { ok: true, reason: `${windowDef.label}时段与营业时间匹配` }
      : { ok: false, reason: `${windowDef.label}时段不在营业时间内（${hoursText}）` };
  }

  if (tagText) {
    const ok = tagText.includes(windowDef.tag);
    return ok
      ? { ok: true, reason: `${windowDef.label}时段与标签匹配` }
      : { ok: false, reason: `${windowDef.label}时段不在该记录标签内` };
  }

  // 部分商圈或用户补充记录没有明确营业时间：不硬排除，但不额外加分。
  return { ok: true, reason: "营业时间未填写，需现场确认" };
}

function normalizePlace(s) {
  return String(s || "")
    .replace(/购物中心|购物广场|商场|商城|时尚|中关村|ART\s*PARK|・|（.*?）|\(.*?\)|食堂|地下|\s+/gi, "")
    .replace(/领展欧美汇/g, "领展")
    .replace(/双安/g, "双安")
    .replace(/华宇/g, "华宇")
    .replace(/大融城/g, "大融城")
    .trim();
}

function placeMatch(a, b) {
  const x = normalizePlace(a);
  const y = normalizePlace(b);
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

function getBuildingInfo(name) {
  const list = window.BUILDINGS || [];
  return list.find(b => b.name === name) || list[0] || null;
}

function selectedRuleIds(state) {
  const ids = [];
  ["body", "preference"].forEach(group => {
    const arr = Array.isArray(state[group]) ? state[group] : [];
    ids.push(...arr);
  });
  ["hunger", "scene", "time"].forEach(group => {
    if (state[group]) ids.push(state[group]);
  });
  return ids.filter(Boolean);
}

function getRuleLabels(state) {
  return selectedRuleIds(state)
    .map(id => (window.STATE_RULES[id] || {}).label)
    .filter(Boolean);
}

function budgetLabel(id) {
  const group = window.STATE_GROUPS.find(g => g.id === "budget");
  const item = group.options.find(o => o.id === id);
  return item ? item.label : "未设置预算";
}

function scoreBudget(item, budgetId) {
  let score = 0;
  let reasons = [];
  const text = itemText(item);
  const price = Number(item.price || 0);

  if (!budgetId) return { score, reasons };

  if (budgetId === "canteen_15_25") {
    if (item.type === "canteen") score += 14;
    if (price >= 15 && price <= 25) { score += 18; reasons.push("价格落在食堂正餐 15–25 元区间"); }
    else if (item.type === "canteen" && price > 0 && price < 15) { score += 9; reasons.push("价格低于 15 元，适合搭配成一餐"); }
    else if (price > 25) score -= 12;
    if (containsAny(text, ["单份主食", "套餐", "盖饭", "米饭", "面食"])) score += 8;
  }

  if (budgetId === "extra_25_50") {
    if (price >= 25 && price <= 50) { score += 20; reasons.push("价格落在 25–50 元加餐/普通校外区间"); }
    if (item.type === "mall") score += 9;
    if (containsAny(text, ["解馋", "满足感强", "安慰型", "朋友聚餐"])) score += 7;
  }

  if (budgetId === "reward_50_plus") {
    if (price >= 50) { score += 22; reasons.push("人均 50 元以上，符合奖励自己场景"); }
    if (item.type === "mall") score += 12;
    if (containsAny(text, ["奖励自己", "满足感强", "有仪式感", "正式聚餐", "愿意专门去吃"])) score += 12;
  }

  if (budgetId === "campus_drink_20") {
    if (item.type === "canteen") score += 12;
    if (price > 0 && price <= 20) { score += 14; reasons.push("20 元以内，适合校内饮品/轻补给"); }
    if (containsAny(text, ["饮品", "咖啡", "茶饮", "奶茶", "豆浆", "果汁"])) score += 22;
    if (!containsAny(text, ["饮品", "咖啡", "茶饮", "奶茶", "豆浆", "果汁"])) score -= 18;
    if (Number(item.fullness) > 3) score -= 10;
  }

  if (budgetId === "tea_25_50") {
    if (price >= 25 && price <= 50) { score += 15; reasons.push("价格落在 25–50 元下午茶区间"); }
    if (item.type === "mall") score += 10;
    if (containsAny(text, ["下午茶", "甜品", "咖啡", "奶茶", "饮品", "蛋糕", "烘焙", "甜口"])) score += 24;
    if (Number(item.fullness) <= 3) score += 6;
  }

  return { score, reasons };
}

function scoreLocation(item, buildingName) {
  const building = getBuildingInfo(buildingName);
  if (!building) return { score: 0, reasons: [] };

  const reasons = [];
  let score = 0;

  if (item.type === "canteen") {
    if (placeMatch(item.area, building.campusPrimary)) {
      score += 18;
      reasons.push(`离你选的「${building.name}」较近，优先 ${building.campusPrimary}`);
    } else if (placeMatch(item.area, building.campusSecondary)) {
      score += 10;
      reasons.push(`也靠近备选就餐区 ${building.campusSecondary}`);
    } else {
      score += 2;
    }
  } else {
    if (placeMatch(item.area, building.mallPrimary)) {
      score += 16;
      reasons.push(`校外距离上优先 ${building.mallPrimary}`);
    } else if (placeMatch(item.area, building.mallSecondary)) {
      score += 9;
      reasons.push(`属于备选商圈 ${building.mallSecondary}`);
    }
  }

  return { score, reasons };
}

function isExcluded(item, ruleIds) {
  const text = itemText(item);
  for (const id of ruleIds) {
    const rule = window.STATE_RULES[id];
    if (!rule || !rule.exclude) continue;

    if (id === "halal") {
      if (String(item.containsPork || "").includes("是")) return "清真优先时排除含猪肉";
      if (containsAny(text, rule.exclude)) return "清真优先时排除猪肉相关";
      const halalConfirmed = String(item.halal || "").includes("是") || text.includes("清真") || text.includes("民族餐厅");
      if (!halalConfirmed) return "清真优先时排除未确认清真";
    }

    if (id !== "halal" && containsAny(text, rule.exclude)) {
      return `不符合「${rule.label}」：${rule.exclude.find(k => text.includes(k))}`;
    }
  }
  return "";
}

function scoreByRules(item, state) {
  const ruleIds = selectedRuleIds(state);
  const text = itemText(item);
  const reasons = [];
  let score = 0;

  const excluded = isExcluded(item, ruleIds);
  if (excluded) return { score: -9999, reasons: [excluded], excluded: true };

  for (const id of ruleIds) {
    const rule = window.STATE_RULES[id];
    if (!rule) continue;

    if (rule.ranges) {
      for (const [field, range] of Object.entries(rule.ranges)) {
        const val = Number(item[field] || 0);
        const [min, max] = range;
        if (val >= min && val <= max) {
          score += 10;
          reasons.push(`${rule.label}：${fieldName(field)} ${val} 在 ${min}–${max}`);
        } else if (val > 0) {
          const gap = val < min ? min - val : val - max;
          score -= Math.min(8, gap * 3);
        }
      }
    }

    if (rule.prefer && rule.prefer.length) {
      const hits = rule.prefer.filter(k => text.includes(k));
      if (hits.length) {
        score += Math.min(18, hits.length * 5);
        reasons.push(`${rule.label}：命中「${hits.slice(0, 2).join("、")}」`);
      }
    }

    if (id === "halal") {
      if (String(item.halal || "").includes("是") || text.includes("清真") || text.includes("民族餐厅")) {
        score += 28;
        reasons.push("清真优先：命中清真/民族餐厅标签");
      }
    }
  }

  return { score, reasons, excluded: false };
}

function fieldName(field) {
  return {
    spicy: "辣度",
    oil: "油腻度",
    fullness: "饱腹感"
  }[field] || field;
}


function isCanteenComponent(item) {
  if (!item || item.type !== "canteen" || item.isCombo) return false;
  const text = itemText(item);
  const price = Number(item.price || 0);
  const name = String(item.name || "");
  if (containsAny(text, ["加购配菜/小料", "加购", "单菜可组合", "需搭配主食", "不建议单独作为一餐", "可作为主食或套餐的附加项"])) return true;
  if (canteenNeedsStaple(item)) return true;
  if (price > 0 && price <= 7 && containsAny(name, ["卤蛋", "水煮蛋", "煎蛋", "单点", "素菜", "白米饭", "紫米饭", "鸡油饭", "香芋椰浆饭", "土豆丝", "包菜", "圆白菜", "青菜", "小料"])) {
    if (containsAny(name, ["肠粉", "灌饼", "手抓饼", "卷饼", "煎饼", "套餐", "盖饭"])) return false;
    return true;
  }
  return false;
}

function isStapleComponent(item) {
  if (!item || item.type !== "canteen") return false;
  const name = String(item.name || "");
  const price = Number(item.price || 0);
  const exactStaples = ["白米饭", "紫米饭", "米饭", "馒头", "花卷", "主食饭"];
  if (price > 0 && price <= 6 && exactStaples.some(x => name === x)) return true;
  if (price > 0 && price <= 3 && name === "米饭") return true;
  return false;
}

function isVegetableDish(item) {
  const text = itemText(item);
  return containsAny(text, ["蔬菜为主", "蔬菜较多", "素菜", "青菜", "白菜", "包菜", "圆白菜", "土豆丝", "豆腐", "玉米", "茄子", "西兰花", "海带", "冬瓜", "木耳", "菌菇", "黄瓜"]);
}

function isProteinDish(item) {
  const text = itemText(item);
  return containsAny(text, ["鸡", "牛", "羊", "鸭", "鱼", "虾", "肉", "蛋", "豆腐", "高蛋白"]);
}

function isDishComponent(item) {
  if (!isCanteenComponent(item) || isStapleComponent(item)) return false;
  const price = Number(item.price || 0);
  return price > 0 && price <= 20;
}

function groupKey(item) {
  return [item.area || "", item.floor || "", item.venue || ""].join("|");
}

function componentAllowed(item, state) {
  const ids = selectedRuleIds(state);
  return !isExcluded(item, ids);
}

function makeVirtualRiceFor(sample, state = {}) {
  const fatLoss = isFatLossState(state);
  return {
    id: `virtual-rice-${groupKey(sample)}`,
    isVirtual: true,
    type: "canteen",
    area: sample.area,
    floor: sample.floor,
    venue: sample.venue,
    name: fatLoss ? "一两米饭" : "米饭",
    priceText: fatLoss ? "约1元" : "约2元",
    price: fatLoss ? 1 : 2,
    unit: "元",
    businessHours: sample.businessHours || "以窗口实际供应为准",
    granularity: "主食搭配",
    orderLogic: fatLoss ? "用于和高蛋白菜品搭配，按少量主食估算" : "用于和小菜组合成一餐",
    foodType: "米饭/主食类",
    staple: "米饭",
    protein: "不明显",
    taste: "清淡/家常",
    spicy: 0,
    oil: 1,
    fullness: fatLoss ? 1 : 2,
    health: fatLoss ? "少量主食;高碳水" : "高碳水",
    mood: "稳妥",
    scene: "堂食;想省钱;正常吃一顿",
    priceLevel: "低预算",
    timeTag: "午餐;晚餐"
  };
}

function canteenComboBudgetRange(state) {
  if (isFatLossState(state) && state.budget === "canteen_15_25") return [5, 25];
  if (state.budget === "canteen_15_25") return [10, 25];
  if (state.budget === "extra_25_50") return [18, 35];
  if (!state.budget) return [10, 25];
  return [10, 25];
}

function buildCanteenCombos(state = {}, limit = 24) {
  if (["reward_50_plus", "campus_drink_20", "tea_25_50"].includes(state.budget)) return [];
  const [minBudget, maxBudget] = canteenComboBudgetRange(state);
  const all = allFoodItems().filter(item => item.type === "canteen" && componentAllowed(item, state));
  const groups = new Map();
  for (const item of all) {
    const key = groupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const combos = [];
  for (const groupItems of groups.values()) {
    const staples = groupItems.filter(isStapleComponent);
    const dishes = groupItems.filter(isDishComponent);
    if (!dishes.length) continue;
    const sample = groupItems[0];
    const staplePool = isFatLossState(state)
      ? [makeVirtualRiceFor(sample, state), ...staples.slice(0, 4)]
      : (staples.length ? staples.slice(0, 5) : [makeVirtualRiceFor(sample, state)]);
    const mains = dishes.filter(x => isProteinDish(x) && !isVegetableDish(x)).slice(0, 24);
    const vegs = dishes.filter(x => isVegetableDish(x) && !isProteinDish(x)).slice(0, 18);
    const mainPool = mains.length ? mains : dishes.slice(0, 24);

    for (const staple of staplePool) {
      for (const main of mainPool) {
        if (main.id === staple.id) continue;
        const baseParts = [staple, main];
        const basePrice = baseParts.reduce((s, x) => s + Number(x.price || 0), 0);
        if (basePrice >= minBudget && basePrice <= maxBudget) {
          combos.push(makeCombo(baseParts, state));
        }
        for (const veg of vegs) {
          if (veg.id === main.id || veg.id === staple.id) continue;
          const parts = [staple, main, veg];
          const total = parts.reduce((s, x) => s + Number(x.price || 0), 0);
          if (total < minBudget || total > maxBudget) continue;
          combos.push(makeCombo(parts, state));
        }
      }
    }
  }

  const seen = new Set();
  return combos
    .filter(x => x && x.item && x.meta && x.meta.finalScore > 0 && !categoryPreferenceMismatch(x.item, state))
    .sort((a, b) => b.meta.finalScore - a.meta.finalScore)
    .filter(x => {
      const key = x.item.items.map(p => p.id).sort().join("+");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function makeCombo(parts, state) {
  const realParts = parts.filter(Boolean);
  const total = realParts.reduce((s, x) => s + Number(x.price || 0), 0);
  const sample = realParts[0] || {};
  const avgSpicy = Math.round(realParts.reduce((s, x) => s + Number(x.spicy || 0), 0) / realParts.length * 10) / 10;
  const avgOil = Math.round(realParts.reduce((s, x) => s + Number(x.oil || 0), 0) / realParts.length * 10) / 10;
  const fullness = clamp(realParts.reduce((s, x) => s + Number(x.fullness || 0), 0), 1, 5);
  const fatLossCombo = isFatLossState(state);
  const name = `${fatLossCombo ? "减脂堂食搭配" : "堂食搭配"}：${realParts.map(x => x.name).join(" + ")}`;
  const combo = {
    id: `combo-${realParts.map(x => x.id).join("-")}`,
    isCombo: true,
    type: "combo",
    area: sample.area,
    floor: sample.floor,
    venue: sample.venue,
    name,
    price: Math.round(total * 10) / 10,
    priceText: `约${Math.round(total * 10) / 10}元`,
    businessHours: sample.businessHours || "以窗口实际供应为准",
    granularity: "组合成餐",
    orderLogic: fatLossCombo ? "由少量主食 + 高蛋白菜品搭配成较低负担堂食" : "由主食 + 菜品搭配成完整堂食，不把小菜单独当一餐",
    foodType: "食堂组合餐",
    staple: realParts.map(x => x.staple).join(";"),
    protein: realParts.map(x => x.protein).join(";"),
    taste: realParts.map(x => x.taste).join(";"),
    spicy: avgSpicy,
    oil: avgOil,
    fullness,
    health: realParts.map(x => x.health).join(";"),
    mood: "稳妥;满足感强;堂食组合",
    scene: "堂食;正常吃一顿;想省钱;很饿",
    priceLevel: total <= 15 ? "低预算组合" : "普通预算组合",
    timeTag: "午餐;晚餐",
    items: realParts,
    comboNote: fatLossCombo ? `减脂中按少量主食估算；这不是单点小菜，而是 ${realParts.length} 项搭配成一餐。` : `这不是单点小菜，而是 ${realParts.length} 项搭配成一餐。`
  };
  const loc = scoreLocation(combo, state.building);
  const partScores = realParts.map(x => scoreFood(x, state, { allowComponent: true, skipCategoryConstraint: true }).finalScore).filter(Number.isFinite);
  const avgPartScore = partScores.length ? partScores.reduce((a,b) => a + b, 0) / partScores.length : 20;
  const vegetableBoost = realParts.some(isVegetableDish) ? 6 : 0;
  const proteinBoost = realParts.some(isProteinDish) ? 6 : 0;
  const priceBoost = total >= 12 && total <= 20 ? 14 : (total <= 25 ? 8 : 0);
  const smallStapleBoost = fatLossCombo && realParts.some(x => x.isVirtual && String(x.name || "").includes("一两米饭")) ? 16 : 0;
  const finalScore = Math.round((avgPartScore + loc.score * 1.1 + vegetableBoost + proteinBoost + priceBoost + smallStapleBoost) * 10) / 10;
  return {
    item: combo,
    meta: {
      finalScore,
      distanceScore: loc.score,
      budgetScore: priceBoost,
      ruleScore: avgPartScore,
      excluded: false,
      reasons: [
        ...loc.reasons,
        fatLossCombo ? `${realParts.length} 项搭配，合计约 ${combo.price} 元，减脂中按少量主食估算` : `${realParts.length} 项搭配，合计约 ${combo.price} 元，避免把小菜/鸡蛋/米饭误当完整一餐`,
        smallStapleBoost ? "减脂中：主食按一两米饭估算，比平时二两更轻" : (vegetableBoost ? "含蔬菜搭配，结构更像一顿饭" : "以主食和主菜形成基础饱腹"),
        proteinBoost ? "含蛋白质来源，饱腹感更稳定" : "适合作为轻量堂食组合"
      ]
    }
  };
}

function isComboResult(x) {
  return x && x.item && x.item.isCombo;
}

function inferMealTime(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 21 * 60) return "night";
  if (minutes >= 17 * 60 + 30 && minutes < 20 * 60) return "dinner";
  if (minutes >= 11 * 60 && minutes < 13 * 60 + 30) return "lunch";
  if (minutes >= 13 * 60 + 30 && minutes < 17 * 60 + 30) return "afternoon";
  return "lunch";
}

function makeMeihuaGua(date = new Date()) {
  const trigrams = [
    { key: "qian", name: "乾", symbol: "☰", image: "天", text: "气象开阔，适合吃得丰盛一点。", moodId: "abundant", hunger: "very_hungry", scene: "date_treat", preference: [] },
    { key: "dui", name: "兑", symbol: "☱", image: "泽", text: "有愉悦之象，适合和朋友分享，或来一点甜。", moodId: "bright", hunger: "normal", scene: "friends", preference: [] },
    { key: "li", name: "离", symbol: "☲", image: "火", text: "明亮有精神，适合香气足、满足感强的选择。", moodId: "spicy", hunger: "normal", scene: "solo", preference: [] },
    { key: "zhen", name: "震", symbol: "☳", image: "雷", text: "行动感很强，适合快速、热乎、醒神的一餐。", moodId: "spicy", hunger: "very_hungry", scene: "hurry", preference: ["noodles"] },
    { key: "xun", name: "巽", symbol: "☴", image: "风", text: "轻柔流动，适合清爽、低负担、有蔬菜的搭配。", moodId: "fresh", hunger: "normal", scene: "solo", preference: ["vegetable"] },
    { key: "kan", name: "坎", symbol: "☵", image: "水", text: "今天更需要被照顾，适合热汤、粥粉面这类暖胃食物。", moodId: "comfort", hunger: "normal", scene: "solo", preference: ["soup"] },
    { key: "gen", name: "艮", symbol: "☶", image: "山", text: "宜稳不宜折腾，选近一点、稳一点、肠胃舒服一点。", moodId: "rest", hunger: "normal", scene: "solo", preference: [] },
    { key: "kun", name: "坤", symbol: "☷", image: "地", text: "朴素踏实，适合米饭、家常菜、能认真吃饱的一餐。", moodId: "abundant", hunger: "very_hungry", scene: "solo", preference: ["rice"] }
  ];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  const min = date.getMinutes();
  const sec = date.getSeconds();
  const upper = trigrams[(y + m + d) % 8];
  const lower = trigrams[(h + min + sec) % 8];
  const movingLine = ((y + m + d + h + min + sec) % 6) + 1;
  const blend = [upper, lower][(movingLine + h) % 2];
  const map = {"☰":"111","☱":"011","☲":"101","☳":"001","☴":"110","☵":"010","☶":"100","☷":"000"};
  const pattern = (map[upper.symbol] || "111") + (map[lower.symbol] || "111");
  const lines = [];
  for (let i = 0; i < 6; i++) lines.push(pattern[i] === "1");
  return {
    upper, lower, movingLine, lines,
    moodId: blend.moodId,
    hunger: blend.hunger,
    scene: blend.scene,
    preference: blend.preference,
    title: `上${upper.name}下${lower.name}`,
    text: `${upper.image}在上，${lower.image}在下；动爻在第 ${movingLine} 爻。${blend.text}`
  };
}

function randomStateFromGua(building, budget, gua) {
  const body = [];
  if (gua.moodId === "abundant") body.push("hot_food");
  if (gua.moodId === "comfort") body.push("stomach_easy");
  if (gua.moodId === "bright") body.push("sweet");
  if (gua.moodId === "fresh") body.push("fat_loss");
  if (gua.moodId === "spicy") body.push("spicy");
  if (gua.moodId === "rest") body.push("tired");
  return {
    building,
    body: body.length ? body : ["hot_food"],
    hunger: gua.hunger || "normal",
    scene: gua.scene || "solo",
    budget,
    preference: gua.preference || [],
    time: inferMealTime(),
    weights: Object.assign({}, window.DEFAULT_WEIGHTS, { distance: 12, budget: 12, novelty: 8 })
  };
}

function scoreFood(item, state, opts = {}) {
  if (!opts.skipCategoryConstraint) {
    const prefMismatch = categoryPreferenceMismatch(item, state);
    if (prefMismatch) {
      return { finalScore: -9999, reasons: [prefMismatch], excluded: true, distanceScore: 0, budgetScore: 0, ruleScore: 0 };
    }
  }
  const allowFatLossProtein = isFatLossProteinStandalone(item, state);
  if (isCanteenComponent(item) && !opts.allowComponent && !allowFatLossProtein) {
    return { finalScore: -9999, reasons: ["这是小菜/主食/加购项，需要搭配后才算一餐"], excluded: true, distanceScore: 0, budgetScore: 0, ruleScore: 0 };
  }
  const weights = Object.assign({}, window.DEFAULT_WEIGHTS, state.weights || {});
  const rule = scoreByRules(item, state);
  if (rule.excluded) return Object.assign({}, rule, { finalScore: -9999, distanceScore: 0, budgetScore: 0 });

  const availability = itemAvailableForSelectedTime(item, state.time);
  if (!availability.ok) {
    return { finalScore: -9999, reasons: [availability.reason], excluded: true, distanceScore: 0, budgetScore: 0, ruleScore: 0 };
  }

  const loc = scoreLocation(item, state.building);
  const bud = scoreBudget(item, state.budget);
  const text = itemText(item);

  let base = item.isCombo ? 24 : 20;
  let preferenceBoost = 0;

  if (containsAny(text, ["稳妥", "工作餐", "一人食", "单份主食", "套餐"])) preferenceBoost += 6;
  if (containsAny(text, ["高蛋白", "蔬菜", "清淡", "低负担"])) preferenceBoost += 5;
  if (state.scene === "friends" && item.type === "mall") preferenceBoost += 8;
  if (state.scene === "hurry" && (item.type === "canteen" || item.type === "combo")) preferenceBoost += 8;
  if (item.isCombo) preferenceBoost += 10;
  if (Array.isArray(state.preference) && state.preference.includes("meat_more") && isProteinDish(item)) preferenceBoost += 14;
  if (allowFatLossProtein) preferenceBoost += 18;
  if (availability.reason && !availability.reason.includes("未填写")) preferenceBoost += 6;
  if (item.dataIssue) preferenceBoost -= 2;

  if (!item.price) preferenceBoost -= 2;

  const finalScore =
    base +
    rule.score * (Number(weights.body || 30) / 30) +
    loc.score * (Number(weights.distance || 10) / 10) +
    bud.score * (Number(weights.budget || 10) / 10) +
    preferenceBoost;

  const reasonList = [...loc.reasons, ...bud.reasons, ...rule.reasons];
  if (availability.reason) reasonList.push(availability.reason);
  if (Array.isArray(state.preference) && state.preference.includes("meat_more") && isProteinDish(item)) reasonList.push("肉多多！！：优先肉/蛋白质更明确的选择");
  if (allowFatLossProtein) reasonList.push("减脂中：这是无明显主食的高蛋白选择，也可以另加一两米饭");
  if (item.dataIssue) reasonList.push("商圈代表菜已自动剔除代金券片段，仅保留可解释的菜品/餐厅信息");
  return {
    finalScore: Math.round(finalScore * 10) / 10,
    reasons: reasonList,
    distanceScore: loc.score,
    budgetScore: bud.score,
    ruleScore: rule.score,
    excluded: false
  };
}

function recommendFoods(state = {}, limit = 60, opts = {}) {
  const all = allFoodItems()
    .map(item => ({ item, meta: scoreFood(item, state, opts) }))
    .filter(x => !x.meta.excluded && x.meta.finalScore > 0)
    .sort((a, b) => b.meta.finalScore - a.meta.finalScore);

  const deduped = [];
  const seen = new Set();
  for (const x of all) {
    const key = `${x.item.type}-${x.item.area}-${x.item.venue}-${x.item.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(x);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

function makeRecommendationGroups(state = {}) {
  const combos = buildCanteenCombos(state, 36);
  const ranked = [...combos, ...recommendFoods(state, 90)]
    .sort((a, b) => b.meta.finalScore - a.meta.finalScore);
  const used = new Set();

  function take(list, n) {
    const out = [];
    for (const x of list) {
      const key = x.item.id;
      if (used.has(key)) continue;
      used.add(key);
      out.push(x);
      if (out.length >= n) break;
    }
    return out;
  }

  const steadyCandidates = ranked
    .slice()
    .sort((a, b) => {
      const sa = a.meta.finalScore + a.meta.distanceScore * 0.7 + (Number(a.item.oil) <= 2 ? 6 : 0) + ((a.item.type === "canteen" || a.item.type === "combo") ? 8 : 0) + (isComboResult(a) ? 12 : 0);
      const sb = b.meta.finalScore + b.meta.distanceScore * 0.7 + (Number(b.item.oil) <= 2 ? 6 : 0) + ((b.item.type === "canteen" || b.item.type === "combo") ? 8 : 0) + (isComboResult(b) ? 12 : 0);
      return sb - sa;
    });

  const balanceCandidates = ranked
    .slice()
    .sort((a, b) => {
      const aBalance = a.meta.finalScore + (Number(a.item.oil) <= 3 ? 4 : 0) + (Number(a.item.fullness) >= 3 ? 4 : 0) + (isComboResult(a) ? 8 : 0);
      const bBalance = b.meta.finalScore + (Number(b.item.oil) <= 3 ? 4 : 0) + (Number(b.item.fullness) >= 3 ? 4 : 0) + (isComboResult(b) ? 8 : 0);
      return bBalance - aBalance;
    });

  const treatCandidates = ranked
    .filter(x => !isComboResult(x) && (containsAny(itemText(x.item), ["奖励自己", "满足感强", "解馋", "甜品", "咖啡", "有仪式感", "正式聚餐"]) || Number(x.item.price || 0) >= 45))
    .sort((a, b) => {
      const at = a.meta.finalScore + (a.item.type === "mall" ? 8 : 0) + (Number(a.item.price || 0) >= 45 ? 8 : 0);
      const bt = b.meta.finalScore + (b.item.type === "mall" ? 8 : 0) + (Number(b.item.price || 0) >= 45 ? 8 : 0);
      return bt - at;
    });

  const comboFirst = combos.length ? [...combos.slice(0, 2), ...steadyCandidates] : steadyCandidates;
  const comboBalance = combos.length ? [...combos.slice(2, 4), ...balanceCandidates] : balanceCandidates;

  return {
    ranked,
    combos,
    steady: take(comboFirst, 3),
    balanced: take(comboBalance, 3),
    treat: take(treatCandidates.length ? treatCandidates : ranked, 3)
  };
}

function searchFoodByKeyword(keyword) {
  const q = String(keyword || "").trim().toLowerCase();
  if (!q) return [];
  return allFoodItems()
    .map(item => {
      const text = itemText(item).toLowerCase();
      let score = 0;
      if (String(item.name || "").toLowerCase().includes(q)) score += 40;
      if (String(item.venue || "").toLowerCase().includes(q)) score += 25;
      if (text.includes(q)) score += 15;
      return { item, meta: { finalScore: score, reasons: score ? [`命中关键词「${keyword}」`] : [] } };
    })
    .filter(x => x.meta.finalScore > 0)
    .sort((a, b) => b.meta.finalScore - a.meta.finalScore)
    .slice(0, 80);
}

function displayName(item) {
  if (!item) return "";
  if (item.isCombo) return item.name || "堂食搭配";
  if (item.type === "mall") return item.venue || item.name || "周边商圈";
  return item.name || item.venue || "未命名";
}

function formatPlace(item) {
  if (item.isCombo) return `${item.area || ""}${item.floor ? " · " + item.floor : ""}${item.venue ? " · " + item.venue : ""} · 堂食组合`;
  if (item.type === "canteen") {
    return `${item.area || ""}${item.floor ? " · " + item.floor : ""}${item.venue ? " · " + item.venue : ""}`;
  }
  if (item.type === "mall") {
    return `${item.area || ""}${item.floor ? " · " + item.floor : ""}${item.note ? " · " + item.note : ""}`;
  }
  return `${item.area || ""}${item.floor ? " · " + item.floor : ""}${item.venue ? " · " + item.venue : ""}`;
}

function formatPrice(item) {
  if (item.isCombo) return item.priceText || `约 ¥${item.price}`;
  return item.priceText || (item.price ? `约 ¥${item.price}` : "价格待核实");
}

function saveFavorite(itemId) {
  const old = JSON.parse(localStorage.getItem("foodFavorites") || "[]");
  if (!old.includes(itemId)) old.unshift(itemId);
  localStorage.setItem("foodFavorites", JSON.stringify(old.slice(0, 80)));
}

function readFavorites() {
  const ids = JSON.parse(localStorage.getItem("foodFavorites") || "[]");
  const map = new Map(allFoodItems().map(x => [x.id, x]));
  return ids.map(id => map.get(id)).filter(Boolean);
}

window.FoodRecommender = {
  recommendFoods,
  makeRecommendationGroups,
  searchFoodByKeyword,
  scoreFood,
  getRuleLabels,
  budgetLabel,
  formatPlace,
  formatPrice,
  displayName,
  saveFavorite,
  readFavorites,
  readUserFoodItems,
  saveUserFoodItem,
  deleteUserFoodItem,
  allFoodItems,
  getBuildingInfo,
  buildCanteenCombos,
  makeMeihuaGua,
  randomStateFromGua,
  inferMealTime
};
