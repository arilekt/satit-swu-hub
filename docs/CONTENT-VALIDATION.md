# Content Validation Checklist

**Goal:** Verify 1,040 exam questions (52 PART × 20 questions) meet quality standards before public release.

---

## Schema Validation (Automated)

### File Structure
- ✓ Exactly 52 exam files: `{subject}-{PART:02d}.md`
- ✓ Each file: valid JSON with `{"questions": [...]}`
- ✓ 20 questions per file (1,040 total)

### Per-Question Structure
- ✓ **Required fields:**
  - `id`: format `{subject}-{PART:02d}-q{num:02d}` (e.g., math-01-q01)
  - `question`: non-empty string (Thai or English)
  - `options`: array of exactly 4 strings
  - `correct_index`: integer 0–3
  - `explanation`: detailed description of correct answer + why distractors are wrong
  - `type`: "multiple-choice"

- ✓ **Optional fields:**
  - `difficulty`: "easy" / "medium" / "hard" / "unknown"
  - `tags`: array of strings

### Example Valid Question
```json
{
  "id": "math-01-q01",
  "type": "multiple-choice",
  "question": "ถ้า x + 5 = 12 แล้ว x มีค่าเท่าใด",
  "options": [
    "7",
    "17",
    "12",
    "2.4"
  ],
  "correct_index": 0,
  "explanation": "x + 5 = 12 → x = 12 - 5 = 7 ✓ | ข้อ 17 จากการบวกแทนลบ | ข้อ 12 ลืมลบ 5 | ข้อ 2.4 หารแทนลบ"
}
```

---

## Content Quality Checks (Manual Spot-Check)

### Selection: 2 PART per subject (random sample)
1. **Math**: PART 06 (Functions), PART 10 (Trigonometry)
2. **Science**: PART 03 (Responses), PART 05 (Mechanics) [already spot-checked in progress]
3. **Thai**: PART 04 (Grammar), PART 07 (Speaking)
4. **Social**: PART 05 (Economy), PART 11 (Culture)
5. **English**: PART 05 (Modals), PART 09 (Sentences) [already spot-checked PART 05, 09]

### Per-Question Criteria
- ✓ **Correctness:** Verified correct answer actually matches question
- ✓ **Age-appropriate:** Level grade 6–M.1 (age 11–13)
- ✓ **One right answer:** Exactly one option is correct
- ✓ **Plausible distractors:** Wrong answers explain common mistakes, not random
- ✓ **Grammar/language:** Clear Thai or English, no typos
- ✓ **Explanation quality:**
  - Explains WHY the correct answer is right
  - Explains WHY each distractor is wrong (common misconception)
  - ~2–3 lines per explanation

### Examples of Issues to Flag
- ❌ No unique correct answer (e.g., 2+ options could be right)
- ❌ Impossible to choose correctly from the text given
- ❌ Typos in question or options
- ❌ Explanation missing or too vague
- ❌ Copied from previous PART (same question, different numbers)
- ❌ Factually wrong (e.g., math error, science misconception)

---

## Video Match & PDF Corrections Log

### Video Matching Confidence
Record in lesson frontmatter and course-map.md:
- **confirmed**: YouTube title matches PART number + content matches PDF range
- **partial**: Title matches PART but content unverified
- **unconfirmed**: Matched by PART order only; no transcript available

### Known PDF Corrections (Logged)
| Subject | Page | Error | Fix | Impact |
|---|---|---|---|---|
| Science | 123 | NO₂ | N₂O | Q set from page 123 area ✓ corrected in lesson |
| Science | 67 | Ca₂CO₃ | CaCO₃ | Q set from page 67 area ✓ corrected in lesson |
| Science | 89 | Axel | Axle | Q set from page 89 area ✓ corrected in lesson |
| Science | 96 | Storm cause (friction) | Rapid air expansion | Q set from page 96 area ✓ corrected in lesson |
| Science | 109 | °K | K | Temperature notation ✓ corrected in lesson |
| Science | 128 | Hard water + soap (surface tension) | Ca/Mg + soap reaction | Q set from page 128 area ✓ corrected in lesson |
| Science | 129 | Unbalanced equations | Balanced (2 equations) | Q set from page 129 area ✓ corrected in lesson |
| English | 13 | "do in Present Continuous" | "do in Present Simple" | Q set from page 13 area ✓ corrected in lesson |

---

## Integration Checklist

- [ ] All 52 exam files created and pass schema validation
- [ ] Spot-check 10 PART files (2 per subject): all correct & well-explained
- [ ] Video matching confidence recorded per PART in frontmatter
- [ ] PDF corrections logged in course-map.md
- [ ] config.json updated: lesson & exam file paths linked
- [ ] local/private backed up (backup/private-data-{date})
- [ ] Ready to integrate into data/exams/ when released

---

## Command to Validate

```bash
python3 /path/to/validate-exams.py data/exams
```

**Expected output:**
```
Summary: 52/52 files found, 1040 questions
✓ All files valid!
```

