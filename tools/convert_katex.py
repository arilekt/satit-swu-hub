#!/usr/bin/env python3
"""
Convert math formulas in markdown to KaTeX notation.

Usage:
  python3 tools/convert_katex.py                    # Preview mode
  python3 tools/convert_katex.py --apply            # Apply changes
  python3 tools/convert_katex.py --file PART        # Specific PART (e.g., 02)
"""

import re
import os
import sys
import glob
from pathlib import Path
from dataclasses import dataclass
from typing import List, Tuple, Optional

DATA_DIR = Path("data/content")
MATH_FILES = sorted(glob.glob(str(DATA_DIR / "math-part*.md")))

@dataclass
class Candidate:
    """A formula candidate for conversion"""
    file_path: str
    line_num: int
    original: str
    suggested: str
    confidence: float  # 0.0-1.0: how confident we are this is a formula


def detect_formula_patterns(line: str, file_path: str, line_num: int) -> List[Candidate]:
    """Detect formula patterns in a line"""
    candidates = []

    # Skip lines that already have LaTeX or are comments
    if '$' in line or line.strip().startswith('```') or line.strip().startswith('<!--'):
        return candidates

    # Pattern 1: Division with variables or subscripts
    # Matches: "n(n + 1) ÷ 2", "a ÷ b", "100 ÷ 15"
    div_pattern = r'(?<!\$)([a-zA-Z₀₁₂₃₄₅₆₇₈₉]+(?:\s*[+\-*/]?\s*[a-zA-Z₀₁₂₃₄₅₆₇₈₉\(\)]+)*)\s*÷\s*([a-zA-Z₀₁₂₃₄₅₆₇₈₉\(\)]+)(?!\$)'
    for m in re.finditer(div_pattern, line):
        orig = m.group(0)
        sugg = f"${orig}$"
        candidates.append(Candidate(file_path, line_num, orig, sugg, 0.75))

    # Pattern 2: Multiplication symbol × with numbers
    mult_pattern = r'\d+\s*×\s*\d+[^a-zA-Z]*'
    for m in re.finditer(mult_pattern, line):
        orig = m.group(0).rstrip()
        # Only if not already in $...$
        if not any(orig in c.original for c in candidates):
            sugg = f"${orig}$"
            candidates.append(Candidate(file_path, line_num, orig, sugg, 0.7))

    # Pattern 3: Subscripts with digits: n₁, a₂, x₃
    subscript_pattern = r'[a-zA-Z]+[₀₁₂₃₄₅₆₇₈₉]+'
    for m in re.finditer(subscript_pattern, line):
        orig = m.group(0)
        if orig not in [c.original for c in candidates]:
            sugg = f"${orig}$"
            candidates.append(Candidate(file_path, line_num, orig, sugg, 0.8))

    # Pattern 4: Fractions in text like "a/b" (but be careful with paths)
    # Only match if surrounded by word boundaries and looks mathematical
    frac_pattern = r'(?<![/\w])([a-zA-Z₀₁₂₃₄₅₆₇₈₉]+)/([a-zA-Z₀₁₂₃₄₅₆₇₈₉]+)(?![/\w])'
    for m in re.finditer(frac_pattern, line):
        orig = m.group(0)
        if 'http' not in line and orig not in [c.original for c in candidates]:
            sugg = f"${orig}$"
            candidates.append(Candidate(file_path, line_num, orig, sugg, 0.6))

    # Pattern 5: Square brackets with formula-like content
    # This helps catch special functions like [n(n + 1) ÷ 2]²
    bracket_formula = r'\[[a-zA-Z₀₁₂₃₄₅₆₇₈₉()\s+\-×÷]+\]'
    for m in re.finditer(bracket_formula, line):
        orig = m.group(0)
        if orig not in [c.original for c in candidates]:
            sugg = f"${orig}$"
            candidates.append(Candidate(file_path, line_num, orig, sugg, 0.7))

    return candidates


def scan_files(file_paths: List[str]) -> List[Candidate]:
    """Scan files for formula candidates"""
    all_candidates = []

    for file_path in file_paths:
        if not os.path.exists(file_path):
            continue

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            candidates = detect_formula_patterns(line, file_path, line_num)
            all_candidates.extend(candidates)

    return all_candidates


def preview_candidates(candidates: List[Candidate]) -> None:
    """Show candidates without applying"""
    if not candidates:
        print("✓ No formula candidates found.")
        return

    print(f"\n📊 Found {len(candidates)} formula candidates:\n")

    by_file = {}
    for c in candidates:
        if c.file_path not in by_file:
            by_file[c.file_path] = []
        by_file[c.file_path].append(c)

    for file_path in sorted(by_file.keys()):
        items = by_file[file_path]
        print(f"📄 {Path(file_path).name}")
        for c in sorted(items, key=lambda x: x.line_num):
            conf_str = f"({c.confidence:.0%})"
            print(f"   Line {c.line_num:3d} {conf_str}: {c.original!r} → {c.suggested!r}")
        print()


def apply_conversions(candidates: List[Candidate]) -> None:
    """Apply conversions to files"""
    by_file = {}
    for c in candidates:
        if c.file_path not in by_file:
            by_file[c.file_path] = []
        by_file[c.file_path].append(c)

    for file_path in sorted(by_file.keys()):
        items = by_file[file_path]

        if not os.path.exists(file_path):
            print(f"⚠️  File not found: {file_path}")
            continue

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        lines = content.split('\n')

        # Sort by line number descending to avoid offset issues
        applied_count = 0
        for c in sorted(items, key=lambda x: x.line_num, reverse=True):
            idx = c.line_num - 1
            if idx < len(lines):
                old_line = lines[idx]
                if c.original in old_line:
                    new_line = old_line.replace(c.original, c.suggested, 1)
                    lines[idx] = new_line
                    applied_count += 1
                    print(f"✏️  {Path(file_path).name}:{c.line_num} ({c.confidence:.0%})")
                    print(f"     − {c.original}")
                    print(f"     + {c.suggested}")

        if applied_count > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(lines))
            print(f"✅ Updated {applied_count} formulas in {Path(file_path).name}\n")


def main():
    # Parse args
    apply = '--apply' in sys.argv
    specific_part = None
    for arg in sys.argv[1:]:
        if '=' in arg:
            key, val = arg.split('=', 1)
            if key == '--file':
                specific_part = val
        elif arg.startswith('--file'):
            idx = sys.argv.index(arg)
            if idx + 1 < len(sys.argv):
                specific_part = sys.argv[idx + 1]

    # Select files
    if specific_part:
        files = [f for f in MATH_FILES if f'part{specific_part}' in f]
        if not files:
            print(f"❌ No math file found for part {specific_part}")
            return
    else:
        files = MATH_FILES

    if not files:
        print("❌ No math files found")
        return

    print(f"🔍 Scanning {len(files)} file(s)...\n")

    candidates = scan_files(files)

    if apply:
        print(f"🔄 Applying {len(candidates)} conversions...\n")
        apply_conversions(candidates)
        print(f"✅ Done! {len(candidates)} formula(s) converted.")
    else:
        preview_candidates(candidates)
        print(f"\nℹ️  Run with --apply to apply changes:")
        print(f"   python3 tools/convert_katex.py --apply")
        if len(files) < len(MATH_FILES):
            print(f"   python3 tools/convert_katex.py --apply --file={specific_part}")


if __name__ == '__main__':
    main()
