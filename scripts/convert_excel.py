"""
Convert Branch_Expenses_Consolidated_*.xlsx into compact JSON for the dashboard.

Reads the three raw tabs (the report tabs are formulas over these):
  - "Branch Master"        -> branch dimension (code, name, type, status)
  - "Data"                 -> 56k ledger entries (expense facts + ledger detail)
  - "HRIS Headcount Data"  -> employees & salary per month x branch x department

Writes to data/generated/:
  dimensions.json   lookup tables (months, branches, heads, sub-categories, ...)
  expense-facts.json   monthly aggregates  [m, branch, head, sub, unit, amount, entries]
  workforce-facts.json monthly HRIS rows   [m, branch, dept, employees, salary]
  ledger.json       every ledger entry (server-side only, used by /api/ledger)

Usage:  python scripts/convert_excel.py [path/to/workbook.xlsx]
Needs:  pip install openpyxl
"""

import glob
import json
import os
import sys
from collections import defaultdict
from datetime import datetime

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "data", "generated")

# Fixed order so chart colours follow the cost head, not its rank.
EXPENSE_HEADS = ["Staff Salaries", "Rent", "Utility Bills", "Other Expenses"]


def month_key(d: datetime) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def fiscal_year(d: datetime) -> str:
    start = d.year if d.month >= 7 else d.year - 1
    return f"FY {start}-{str(start + 1)[-2:]}"


class Index:
    """Value -> integer id, preserving first-seen order."""

    def __init__(self, seed=None):
        self.values, self.ids = [], {}
        for v in seed or []:
            self.get(v)

    def get(self, value):
        if value not in self.ids:
            self.ids[value] = len(self.values)
            self.values.append(value)
        return self.ids[value]


def find_workbook() -> str:
    if len(sys.argv) > 1:
        return sys.argv[1]
    matches = sorted(glob.glob(os.path.join(ROOT, "*.xlsx")))
    if not matches:
        sys.exit("No .xlsx file found in the project root.")
    return matches[-1]


def read_branch_master(wb):
    branches = []
    for row in wb["Branch Master"].iter_rows(min_row=7, values_only=True):
        code, name, btype, first, last, status = row[1:7]
        # Section headers / subtotals have no type
        if not code or not name or btype not in ("Branch", "Factory / Office", "B-Coffee"):
            continue
        branches.append({
            "code": str(code),
            "name": str(name),
            "type": btype,
            "status": status,
            "firstMonth": month_key(first) if isinstance(first, datetime) else None,
            "lastMonth": month_key(last) if isinstance(last, datetime) else None,
        })
    return branches


def main():
    path = find_workbook()
    print(f"Reading {os.path.basename(path)} ...")
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)

    branches = read_branch_master(wb)
    branch_idx = {b["code"]: i for i, b in enumerate(branches)}
    branch_by_name = {b["name"]: i for i, b in enumerate(branches)}

    heads = Index(EXPENSE_HEADS)
    subs, units, ledgers = Index(), Index(), Index()

    # ---- Data tab: ledger entries ----------------------------------------
    facts = defaultdict(lambda: [0.0, 0])
    ledger_rows = []
    months_seen = set()
    grand_total = 0.0
    for r in wb["Data"].iter_rows(min_row=5, values_only=True):
        if r[0] is None or r[17] is None:
            continue
        date, month = r[1], r[5]
        code, head, sub, unit = str(r[7]), r[10], r[11], r[12]
        amount = float(r[17])
        if code not in branch_idx:
            sys.exit(f"Branch code {code!r} in Data tab is missing from Branch Master")
        mk = month_key(month)
        months_seen.add(mk)
        key = (mk, branch_idx[code], heads.get(head), subs.get(sub), units.get(unit))
        facts[key][0] += amount
        facts[key][1] += 1
        grand_total += amount
        ledger_rows.append([
            date.strftime("%Y-%m-%d"),
            branch_idx[code],
            heads.get(head),
            subs.get(sub),
            units.get(unit),
            ledgers.get(r[13] or ""),
            str(r[14] or ""),
            str(r[15] or ""),
            (r[16] or "").strip(),
            round(amount, 2),
        ])

    # ---- HRIS Headcount Data ---------------------------------------------
    depts = {}
    workforce = []
    hris_rows = list(wb["HRIS Headcount Data"].iter_rows(min_row=5, values_only=True))
    for r in hris_rows:
        month, _, bname, dcode, dname, employees, salary = r[:7]
        if month is None or bname is None:
            continue
        if bname not in branch_by_name:
            # Location only present in HRIS (e.g. "Gulshan e Hadeed")
            code = "".join(w[0] for w in bname.split()).upper()
            branches.append({"code": code, "name": bname, "type": "Branch",
                             "status": "HRIS only", "firstMonth": None, "lastMonth": None})
            branch_by_name[bname] = len(branches) - 1
        depts.setdefault(dcode, dname)
        months_seen.add(month_key(month))
        workforce.append((month_key(month), branch_by_name[bname], dcode,
                          int(employees or 0), round(float(salary or 0), 2)))

    # Continuous month axis from first to last month
    first, last = min(months_seen), max(months_seen)
    months = []
    y, m = int(first[:4]), int(first[5:])
    while f"{y:04d}-{m:02d}" <= last:
        months.append(f"{y:04d}-{m:02d}")
        m = 1 if m == 12 else m + 1
        y = y + 1 if m == 1 else y
    month_idx = {mk: i for i, mk in enumerate(months)}

    dept_codes = sorted(depts, key=lambda c: (c.startswith("("), depts[c].lower()))
    dept_idx = {c: i for i, c in enumerate(dept_codes)}

    # ---- Write outputs -----------------------------------------------------
    os.makedirs(OUT_DIR, exist_ok=True)

    def write(name, payload):
        p = os.path.join(OUT_DIR, name)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  {name:22s} {os.path.getsize(p) / 1024:8.0f} KB")

    write("dimensions.json", {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "sourceFile": os.path.basename(path),
        "months": months,
        "fiscalYears": sorted({fiscal_year(datetime(int(k[:4]), int(k[5:]), 1)) for k in months}),
        "branches": branches,
        "expenseHeads": heads.values,
        "subCategories": subs.values,
        "costUnits": units.values,
        "departments": [{"code": c, "name": depts[c]} for c in dept_codes],
        "totals": {"spend": round(grand_total, 2), "entries": len(ledger_rows)},
    })
    write("expense-facts.json", [
        [month_idx[k[0]], k[1], k[2], k[3], k[4], round(v[0], 2), v[1]]
        for k, v in sorted(facts.items())
    ])
    write("workforce-facts.json", [
        [month_idx[mk], b, dept_idx[d], e, s] for mk, b, d, e, s in workforce
    ])
    ledger_rows.sort(key=lambda row: row[0])
    write("ledger.json", {"ledgerAccounts": ledgers.values, "rows": ledger_rows})

    print(f"Done: {len(ledger_rows):,} ledger entries, total PKR {grand_total:,.2f}")


if __name__ == "__main__":
    main()
