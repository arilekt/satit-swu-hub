# HANDOFF - Satit SWU Hub Content Status

**Last Updated:** 2026-10-04  
**Status:** Starting content creation cycle  
**Branch:** claude/trusting-easley-b8c9c2

---

## Summary

The project aims to create comprehensive test prep content for 5 subjects across 53 chapters. Currently:
- **Complete**: Social Studies (13 PART + 1 mock exam) with content files ✅
- **Pending**: Math (12 PART), Science (7 PART), Thai (9 PART), English (11 PART)
- **Issue**: Chapter titles and content files still marked as "pending" or null on website

---

## Current Status by Subject

### 🔶 Math (คณิต) - DRAFT (Validation In Progress)
- **PART 08**: ✅ 20 ข้อ (Completed - needs re-verification)
- **PART 09**: 🔶 DRAFT - 20 ข้อ (Generated, awaiting spot-check)
- **PART 10**: 🔶 DRAFT - 20 ข้อ (Generated, awaiting spot-check)
- **PART 11**: 🔶 DRAFT - 20 ข้อ (Generated, awaiting spot-check)
- **PART 12**: 🔶 DRAFT - 20 ข้อ (Generated, awaiting spot-check)
- **Status**: PDF access restored via Documents copy; spot-checking in progress; questions not yet verified against actual PDF content
- **Next Step**: Complete spot-check of 5 questions per PART, adjust counts based on content complexity, update PART 08 verification

### ✅ Social Studies (สังคม) - COMPLETE
- **Content**: PART 01-13 (13 files in `data/content/`)
- **Exams**: social-mock01.md (1 file)
- **Chapter Titles**: 
  - PART 01: "พุทธศาสนา" (Buddhism)
  - PART 02: "หน้าที่พลเมือง" (Citizenship Duties)
  - PART 03-13: MISSING (marked "pending" in config.json)
- **Status**: Needs chapter_status updated from "pending" to "completed" after verification
- **Action**: Verify PDF content, add missing chapter titles, validate questions

### ✅ Math (คณิต) - PART 08-12 COMPLETE
- **Status**: Files created ✓
- **PART 08**: รูปสี่เหลี่ยม (6 ข้อ)
- **PART 09**: รูปวงกลม (5 ข้อ)
- **PART 10**: รูปสามมิติและปริมาตร (5 ข้อ)
- **PART 11**: บัญญัติไตรยางค์ (5 ข้อ)
- **PART 12**: ร้อยละและอัตราส่วน (5 ข้อ)
- **Total**: 5 files + 26 questions
- **Next**: PART 01-07 (when needed), then other subjects

### ⏳ Science (วิทย์) - NOT STARTED
- **PART**: 7 chapters expected
- **Current Status**: All files null, chapter_titles null, all "pending"
- **Action**: Create content MD files + chapter titles + 10-30 quiz questions per PART

### ⏳ Thai (ไทย) - NOT STARTED
- **PART**: 9 chapters expected
- **Current Status**: All files null, chapter_titles null, all "pending"
- **Action**: Create content MD files + chapter titles + 10-30 quiz questions per PART

### ⏳ English (อังกฤษ) - NOT STARTED
- **PART**: 11 chapters expected
- **Current Status**: All files null, chapter_titles null, all "pending"
- **Action**: Create content MD files + chapter titles + 10-30 quiz questions per PART

---

## Files & Data Structure

### What Exists Locally (in worktree)
```
data/
├── content/
│   ├── social-part01.md ✅
│   ├── social-part02.md ✅
│   ├── social-part03.md ✅
│   ... (through social-part13.md)
├── exams/
│   └── social-mock01.md ✅
├── config.json (defines structure for all 53 chapters)
└── build.json
```

### What's Missing (need to create)
- Math PART 08-12: `data/content/math-part08.md` ... `math-part12.md` (PRIORITY)
- Math PART 01-07: `math-part01.md` ... `math-part07.md`
- Science PART 01-07: `science-part01.md` ... `science-part07.md`
- Thai PART 01-09: `thai-part01.md` ... `thai-part09.md`
- English PART 01-11: `english-part01.md` ... `english-part11.md`
- Quiz files for all subjects (currently all null in config.json)

---

## Next Steps (Coordinator Brief)

### Immediate (This session)
1. **Propose Plan**: For Math PART 08-12
   - Number of questions per PART (10-30 based on content volume)
   - Content structure (key concepts + summary)
   
2. **Validation Plan**:
   - Use schema validator to check MD format
   - Spot-check 5 questions per PART against source PDF
   - Cross-reference chapter titles with official curriculum

3. **Work Locally Only**:
   - Create files in `local/private/` first (if PDF present)
   - Do NOT push content or PDF to repo without permission
   - Update HANDOFF.md with completion status

### Constraints
- ❌ Do NOT push content/PDF to GitHub repo
- ❌ Do NOT commit until user confirms (พี่ยืนยัน)
- ✅ Validate with schema validator
- ✅ Spot-check 5 questions per PART vs PDF
- ✅ Propose question count (10-30) and wait for approval

### Content Order (per coordinator)
1. Math (คณิต) PART 08-12 - FIRST
2. Then: วิทย์ → ไทย → สังคม → อังกฤษ
3. For each PART: Summary + Chapter Name + Quiz Questions

---

## File Format Reference

### Content File Template (YAML frontmatter + Markdown)
```markdown
---
part: "PART 01"
subject: "social"
chapter_title: "พุทธศาสนา"
video_url: "https://youtu.be/xxx"
duration_minutes: 15
---

## บทที่ 1: พุทธศาสนา

### แนวคิดหลัก
- Concept 1
- Concept 2

### สรุป
[Content summary here]
```

### Quiz File Template
```markdown
---
part: "social-part01-quiz"
subject: "social"
questions: 20
---

[Question/Answer structure with index 0-19]
```

---

## Validation Checklist

Before committing each PART:
- [ ] MD file exists with proper YAML frontmatter
- [ ] chapter_title is non-null and Thai
- [ ] chapter_status updated (pending → completed/verified)
- [ ] Quiz file: 10-30 questions (user approval)
- [ ] Schema validation passes
- [ ] 5 sample questions spot-checked vs PDF
- [ ] No grammar/spelling errors
- [ ] All links/video URLs valid

---

## Questions for User (พี่)

1. **Math PART 08-12**: How many quiz questions per PART? (Recommend: 20-25)
   - PART 08: ? questions
   - PART 09: ? questions
   - PART 10: ? questions
   - PART 11: ? questions
   - PART 12: ? questions

2. **Content Priority**: After Math, should we do วิทย์ → ไทย → สังคม → อังกฤษ? Or different order?

3. **Source Material**: PDFs should be placed in `local/inbox/math/`, etc. correct?

---

## Related Documentation
- Project README: [README.md](README.md)
- Validation Rules: [VALIDATION.md](VALIDATION.md)
- Data Architecture: [docs/DATA-ARCHITECTURE.md](docs/DATA-ARCHITECTURE.md)
