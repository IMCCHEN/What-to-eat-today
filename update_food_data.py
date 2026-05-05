# -*- coding: utf-8 -*-
"""
update_food_data.py

用法：
1. 把本文件放在网站项目根目录，也就是和 index.html 同一级。
2. 把最新 Excel 放到 data/今天该吃什么_最终标签数据库.xlsx。
3. 在终端运行：python update_food_data.py
4. 脚本会自动生成/覆盖 js/food-data.js。

也可以指定 Excel 路径：
python update_food_data.py "D:\\你的路径\\今天该吃什么_最终标签数据库.xlsx"

本脚本不依赖 pandas / openpyxl，只使用 Python 自带库。
"""

from __future__ import annotations

import csv
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"a": NS_MAIN, "r": NS_REL, "pr": NS_PKG_REL}

EXPECTED_SHEETS = ["东区食堂+标签", "中区食堂+标签", "商圈+标签", "所在片区与商圈"]
VOUCHER_WORDS = ["代金券", "抵用券", "优惠券", "团购券", "兑换券", "自助券", "券包", "餐券"]
SPLIT_RE = re.compile(r"[、/／;；,，|｜+＋\n\r]+")


def cell_col_index(cell_ref: str) -> int:
    letters = re.sub(r"[^A-Z]", "", cell_ref.upper())
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - ord("A") + 1)
    return max(n - 1, 0)


def norm_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0") and re.fullmatch(r"-?\d+\.0", text):
        text = text[:-2]
    return re.sub(r"\s+", " ", text)


def first_nonempty(row: Dict[str, Any], aliases: List[str]) -> str:
    for key in aliases:
        if key in row and norm_text(row.get(key)):
            return norm_text(row.get(key))
    return ""


def first_number(text: str) -> Optional[float]:
    m = re.search(r"\d+(?:\.\d+)?", norm_text(text))
    if not m:
        return None
    try:
        num = float(m.group())
        return int(num) if num.is_integer() else num
    except Exception:
        return None


def detect_unit(price_text: str) -> str:
    text = norm_text(price_text)
    if "人均" in text or "/ 人" in text or "/人" in text:
        return "人均"
    if "元" in text:
        return "元"
    return ""


def clean_business_hours_text(text: str) -> str:
    """修正 Excel 下拉填充导致的营业时间尾数递增错误。

    典型错误：22:00 被下拉成 22:01、22:02；18:45 被下拉成 18:60、18:101。
    只处理明显不可能/高度疑似的结束时间，保留正常的 19:30 等写法。
    """
    value = norm_text(text)
    if not value:
        return ""
    # 已知本项目表格中被下拉拖动污染的模式：同一窗口整段记录的结束分钟被递增。
    fixes = [
        (r"(早6:45—8:45，午10:45—13:15，晚16:45—18:)\d{1,3}", r"\g<1>45"),
        (r"(一层：早6:45—8:45，午10:45—12:45，晚16:45—18:)\d{1,3}", r"\g<1>45"),
        (r"(二层：午10:45—12:45，晚16:45—18:)\d{1,3}", r"\g<1>45"),
        (r"(早7:00—10:00，午晚10:30—22:)\d{1,3}", r"\g<1>00"),
        (r"(8:00—22:)\d{1,3}", r"\g<1>00"),
        (r"(8:00—23:)\d{1,3}", r"\g<1>00"),
    ]
    for pattern, repl in fixes:
        value = re.sub(pattern, repl, value)
    return value


def parse_shared_strings(z: zipfile.ZipFile) -> List[str]:
    if "xl/sharedStrings.xml" not in z.namelist():
        return []
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    strings = []
    for si in root.findall("a:si", NS):
        strings.append("".join(t.text or "" for t in si.findall(".//a:t", NS)))
    return strings


def get_sheet_targets(z: zipfile.ZipFile) -> List[Tuple[str, str]]:
    workbook = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rel_map = {}
    for rel in rels:
        rel_id = rel.attrib.get("Id")
        target = rel.attrib.get("Target", "")
        if rel_id:
            rel_map[rel_id] = target
    result = []
    for sheet in workbook.findall("a:sheets/a:sheet", NS):
        name = sheet.attrib.get("name", "")
        rid = sheet.attrib.get(f"{{{NS_REL}}}id", "")
        target = rel_map.get(rid, "")
        if not target:
            continue
        if target.startswith("/"):
            path = target.lstrip("/")
        elif target.startswith("xl/"):
            path = target
        else:
            path = "xl/" + target
        result.append((name, path))
    return result


def read_cell(cell: ET.Element, shared: List[str]) -> str:
    t = cell.attrib.get("t", "")
    if t == "s":
        v = cell.find("a:v", NS)
        if v is None or v.text is None:
            return ""
        try:
            return shared[int(v.text)]
        except Exception:
            return ""
    if t == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//a:t", NS))
    v = cell.find("a:v", NS)
    return "" if v is None or v.text is None else v.text


def parse_sheet(z: zipfile.ZipFile, sheet_path: str, shared: List[str]) -> List[Dict[str, str]]:
    root = ET.fromstring(z.read(sheet_path))
    raw_rows: List[List[str]] = []
    for row in root.findall(".//a:sheetData/a:row", NS):
        values: List[str] = []
        for cell in row.findall("a:c", NS):
            idx = cell_col_index(cell.attrib.get("r", "A1"))
            while len(values) <= idx:
                values.append("")
            values[idx] = norm_text(read_cell(cell, shared))
        if any(values):
            raw_rows.append(values)
    if not raw_rows:
        return []

    header_idx = 0
    for i, row in enumerate(raw_rows[:10]):
        if sum(1 for x in row if x) >= 2:
            header_idx = i
            break

    headers = raw_rows[header_idx]
    seen: Dict[str, int] = {}
    clean_headers = []
    for i, h in enumerate(headers):
        h = h or f"未命名列{i+1}"
        if h in seen:
            seen[h] += 1
            h = f"{h}_{seen[h]}"
        else:
            seen[h] = 1
        clean_headers.append(h)

    data = []
    for row in raw_rows[header_idx + 1:]:
        obj = {}
        for i, header in enumerate(clean_headers):
            obj[header] = row[i] if i < len(row) else ""
        if any(norm_text(v) for v in obj.values()):
            data.append(obj)
    return data


def read_xlsx(path: Path) -> Dict[str, List[Dict[str, str]]]:
    with zipfile.ZipFile(path) as z:
        shared = parse_shared_strings(z)
        sheets = {}
        for name, target in get_sheet_targets(z):
            sheets[name] = parse_sheet(z, target, shared)
        return sheets


def has_voucher(text: str) -> bool:
    return any(word in norm_text(text) for word in VOUCHER_WORDS)


def clean_voucher_name(name: str, venue: str = "", note: str = "") -> Tuple[str, bool, str]:
    original = norm_text(name)
    if not has_voucher(original):
        return original, False, ""

    parts = [norm_text(p) for p in SPLIT_RE.split(original) if norm_text(p)]
    kept = [p for p in parts if not has_voucher(p)]
    cleaned = " / ".join(kept).strip(" -—_/，,、")
    reason = "代表菜/对象名含券类词，已从网页推荐名称中剔除"

    if not cleaned:
        if note:
            cleaned = f"{note}餐厅推荐"
        elif venue:
            cleaned = "到店按餐厅点单"
        else:
            cleaned = "餐厅推荐"
        reason += "；原字段没有可保留菜名，已改为餐厅级推荐"
    return cleaned, True, reason


def build_search_text(item: Dict[str, Any]) -> str:
    keys = [
        "name", "venue", "note", "granularity", "foodType", "staple", "protein", "taste",
        "health", "mood", "scene", "priceLevel", "timeTag", "area", "floor"
    ]
    return " ".join(norm_text(item.get(k, "")) for k in keys if norm_text(item.get(k, "")))


def infer_type(sheet_name: str) -> str:
    return "mall" if "商圈" in sheet_name else "canteen"


def infer_area(sheet_name: str, row: Dict[str, str]) -> str:
    value = first_nonempty(row, ["所在片区", "片区", "食堂片区", "食堂", "食堂/商圈", "商圈", "商场", "地点", "区域"])
    if value:
        return value
    if sheet_name.startswith("东区"):
        return "东区"
    if sheet_name.startswith("中区"):
        return "中区"
    return ""


def normalize_food_item(sheet_name: str, row: Dict[str, str], row_number: int, voucher_report: List[Dict[str, str]]) -> Optional[Dict[str, Any]]:
    item_type = infer_type(sheet_name)
    name = first_nonempty(row, ["菜名/对象名", "菜名", "对象名", "菜品名称", "菜品/代表菜", "菜品/对象名", "代表菜品名", "代表菜品", "代表菜", "推荐菜品", "套餐/菜品", "名称"])
    venue = first_nonempty(row, ["窗口/类型", "窗口", "餐厅 / 窗口", "餐厅/窗口", "餐厅名", "餐厅名称", "店名", "商户名称", "商家名称", "店铺名称"])
    note = first_nonempty(row, ["备注/当前分类", "备注", "备注/分类", "当前分类", "类型", "菜系", "品类", "分类"])
    original_name = name

    if item_type == "mall":
        name, changed, reason = clean_voucher_name(name, venue, note)
        if changed:
            voucher_report.append({
                "source": sheet_name,
                "source_row": str(row_number),
                "area": infer_area(sheet_name, row),
                "venue": venue,
                "note": note,
                "original_name": original_name,
                "cleaned_name": name,
                "reason": reason,
            })

    if not name and not venue:
        return None

    price_text = first_nonempty(row, ["价格", "价格/人均", "人均", "人均价格", "参考价格", "单价", "单价/人均消费", "人均消费", "人均数值", "原价格"])
    spicy = first_number(first_nonempty(row, ["辣度确认(0-5)", "辣度确认", "辣度", "辣度0-5"])
    )
    oil = first_number(first_nonempty(row, ["油腻确认(1-5)", "油腻确认", "油腻", "油腻程度", "油腻程度1-5", "油腻1-5"])
    )
    fullness = first_number(first_nonempty(row, ["饱腹确认(1-5)", "饱腹确认", "饱腹", "饱腹感", "饱腹感1-5", "饱腹程度", "饱腹1-5", "饱腹贡献1-5"])
    )

    item: Dict[str, Any] = {
        "id": f"{sheet_name}-{row_number}",
        "source": sheet_name,
        "sourceRow": row_number,
        "type": item_type,
        "area": infer_area(sheet_name, row),
        "floor": first_nonempty(row, ["楼层", "楼层/位置", "楼层/具体位置", "具体位置", "位置", "所在楼层"]),
        "venue": venue,
        "note": note,
        "name": name,
        "originalName": original_name if original_name != name else "",
        "priceText": price_text,
        "price": first_number(price_text),
        "unit": first_nonempty(row, ["单位", "计价单位"]) or detect_unit(price_text),
        "businessHours": clean_business_hours_text(first_nonempty(row, ["营业时间", "开放时间", "经营时间", "时间"])),
        "granularity": first_nonempty(row, ["推荐颗粒度", "点餐单位确认", "点餐单位", "颗粒度"]),
        "orderLogic": first_nonempty(row, ["点餐逻辑", "点餐逻辑/推荐口径", "推荐口径", "点餐说明", "组合逻辑", "备注/点餐逻辑"]),
        "foodType": first_nonempty(row, ["餐饮类型", "菜品类型", "类型标签", "食物类型"]),
        "staple": first_nonempty(row, ["主食基础", "主食类型", "主食", "碳水来源"]),
        "protein": first_nonempty(row, ["蛋白类型", "主料/蛋白来源确认", "主料/蛋白来源", "蛋白来源", "主料"]),
        "taste": first_nonempty(row, ["口味标签", "口味", "味型"]),
        "spicy": spicy if spicy is not None else 0,
        "oil": oil if oil is not None else 0,
        "fullness": fullness if fullness is not None else 0,
        "health": first_nonempty(row, ["健康倾向标签", "健康标签", "健康倾向"]),
        "mood": first_nonempty(row, ["情绪标签", "情绪", "满足感标签"]),
        "scene": first_nonempty(row, ["适合时段/场景补充", "适合时段/场景", "适合场景", "场景标签"]),
        "priceLevel": first_nonempty(row, ["价格等级", "预算等级", "预算标签"]),
        "timeTag": first_nonempty(row, ["时段标签", "适合时段", "时段"]),
        "containsPork": first_nonempty(row, ["是否含猪肉", "含猪肉", "猪肉", "人工确认_是否含猪肉"]),
        "halal": first_nonempty(row, ["是否清真可食", "清真可食", "清真", "人工确认_是否清真可食"]),
        "singleMeal": first_nonempty(row, ["是否可单独成餐", "可否单独成餐", "单独成餐", "人工确认_是否可单独成餐"]),
        "manualNote": first_nonempty(row, ["人工确认", "人工备注", "备注2", "需确认原因", "人工确认_人工备注"]),
    }
    item["searchText"] = build_search_text(item)
    return item


def normalize_building(row: Dict[str, str]) -> Optional[Dict[str, str]]:
    name = first_nonempty(row, ["楼宇", "楼宇/位置", "所在楼宇", "位置", "建筑", "地点", "building_name"] )
    if not name:
        return None
    return {
        "name": name,
        "campusPrimary": first_nonempty(row, ["校内首选", "校内首选食堂", "最近校内片区", "最近食堂", "首选食堂", "校内首选就餐区"]),
        "campusSecondary": first_nonempty(row, ["校内备选", "校内备选食堂", "备选校内片区", "备选食堂", "校内备选就餐区"]),
        "mallPrimary": first_nonempty(row, ["校外首选商圈", "商圈首选", "最近商圈", "邻近商圈", "首选商圈", "校外首选商圈（对应校门最短距离）"]),
        "mallSecondary": first_nonempty(row, ["校外备选商圈", "商圈备选", "备选商圈", "第二商圈", "校外备选商圈（次短距离 + 方位互补）"]),
    }


def generate_data(sheets: Dict[str, List[Dict[str, str]]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, str]], List[Dict[str, str]]]:
    food_items: List[Dict[str, Any]] = []
    buildings: List[Dict[str, str]] = []
    voucher_report: List[Dict[str, str]] = []

    skip_sheets = {"处理说明", "全量菜品标签库", "所在片区与商圈", "已删除_价格不清晰"}
    for sheet_name, rows in sheets.items():
        if sheet_name in skip_sheets:
            continue
        if "标签" not in sheet_name and not any(key in sheet_name for key in ["食堂", "商圈", "地下"]):
            continue
        for idx, row in enumerate(rows, start=2):
            keep_flag = norm_text(row.get("人工确认_是否保留", ""))
            if keep_flag in {"否", "不保留", "删除"}:
                continue
            item = normalize_food_item(sheet_name, row, idx, voucher_report)
            if item:
                food_items.append(item)

    building_rows = sheets.get("所在片区与商圈", [])
    if not building_rows:
        for sheet_name, rows in sheets.items():
            if "所在片区" in sheet_name and "商圈" in sheet_name:
                building_rows = rows
                break
    for row in building_rows:
        building = normalize_building(row)
        if building:
            buildings.append(building)

    return food_items, buildings, voucher_report


def write_reports(project_root: Path, report: List[Dict[str, str]]) -> None:
    csv_path = project_root / "voucher_cleanup_report.csv"
    md_path = project_root / "voucher_cleanup_report.md"
    fields = ["source", "source_row", "area", "venue", "note", "original_name", "cleaned_name", "reason"]

    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in report:
            writer.writerow(row)

    lines = ["# 代金券/券类数据清理清单", ""]
    lines.append(f"共发现并处理 {len(report)} 条券类字段。")
    lines.append("")
    lines.append("|来源|原行号|商圈/片区|餐厅/窗口|原名称|清理后名称|说明|")
    lines.append("|---|---:|---|---|---|---|---|")
    for row in report:
        lines.append(
            "|" + "|".join(
                norm_text(row.get(k, "")).replace("|", "/")
                for k in ["source", "source_row", "area", "venue", "original_name", "cleaned_name", "reason"]
            ) + "|"
        )
    md_path.write_text("\n".join(lines), encoding="utf-8")


def find_excel(project_root: Path) -> Path:
    if len(sys.argv) >= 2:
        candidate = Path(sys.argv[1]).expanduser()
        if candidate.exists():
            return candidate
        raise FileNotFoundError(f"没有找到你指定的 Excel：{candidate}")

    preferred = project_root / "data" / "今天该吃什么_最终标签数据库.xlsx"
    if preferred.exists():
        return preferred

    candidates = list((project_root / "data").glob("*.xlsx")) if (project_root / "data").exists() else []
    candidates += list(project_root.glob("*.xlsx"))
    candidates = [p for p in candidates if not p.name.startswith("~$")]
    if candidates:
        return candidates[0]

    raise FileNotFoundError(
        "没有找到 Excel。请把数据库放到 data/今天该吃什么_最终标签数据库.xlsx，"
        "或者运行：python update_food_data.py 你的Excel完整路径"
    )


def main() -> None:
    project_root = Path(__file__).resolve().parent
    js_dir = project_root / "js"
    js_dir.mkdir(parents=True, exist_ok=True)
    (project_root / "data").mkdir(parents=True, exist_ok=True)

    excel_path = find_excel(project_root)
    print(f"正在读取 Excel：{excel_path}")
    sheets = read_xlsx(excel_path)
    print("读取到的工作表：" + "、".join(sheets.keys()))

    food_items, buildings, voucher_report = generate_data(sheets)
    if not food_items:
        raise RuntimeError("没有生成任何食物数据，请检查 Excel 表头是否被改动。")

    output = "window.FOOD_ITEMS = " + json.dumps(food_items, ensure_ascii=False, separators=(",", ":")) + ";\n"
    output += "window.BUILDINGS = " + json.dumps(buildings, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (js_dir / "food-data.js").write_text(output, encoding="utf-8")
    write_reports(project_root, voucher_report)

    print("\n更新完成！")
    print(f"已生成：{js_dir / 'food-data.js'}")
    print(f"食物/餐厅记录：{len(food_items)} 条")
    print(f"楼宇映射记录：{len(buildings)} 条")
    print(f"券类清理记录：{len(voucher_report)} 条")
    print("如网页已打开，请按 Ctrl + F5 强制刷新。")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("\n更新失败：")
        print(e)
        sys.exit(1)
