#!/usr/bin/env python3
"""
Validate exam files structure and content
- 52 PART files × 20 questions each = 1040 total
- Each question must have id, question, options[4], correct_index, explanation, etc.
"""
import json
import sys
from pathlib import Path

STRUCTURE = {
    "math": 12,
    "science": 7,
    "thai": 9,
    "social": 13,
    "english": 11
}

def validate_exam_file(filepath):
    """Validate a single exam file"""
    errors = []
    try:
        with open(filepath) as f:
            data = json.load(f)
        
        if "questions" not in data:
            errors.append("Missing 'questions' array")
            return errors
        
        questions = data["questions"]
        if len(questions) != 20:
            errors.append(f"Expected 20 questions, got {len(questions)}")
        
        for i, q in enumerate(questions):
            required_fields = ["id", "question", "options", "correct_index", "explanation"]
            missing = [f for f in required_fields if f not in q]
            if missing:
                errors.append(f"Question {i+1}: missing {', '.join(missing)}")
            
            if "options" in q and len(q["options"]) != 4:
                errors.append(f"Question {i+1}: expected 4 options, got {len(q['options'])}")
            
            if "correct_index" in q and not (0 <= q["correct_index"] < 4):
                errors.append(f"Question {i+1}: correct_index out of range (0-3): {q['correct_index']}")
        
        return errors
    except json.JSONDecodeError as e:
        return [f"JSON parse error: {e}"]
    except Exception as e:
        return [f"Error: {e}"]

def validate_all(base_path="data/exams"):
    """Validate all exam files"""
    base = Path(base_path)
    total_files = sum(STRUCTURE.values())
    found_files = 0
    total_questions = 0
    all_errors = []
    
    for subject, parts in STRUCTURE.items():
        for part_num in range(1, parts + 1):
            filename = f"{subject}-{part_num:02d}.md"
            filepath = base / filename
            
            if filepath.exists():
                found_files += 1
                errors = validate_exam_file(filepath)
                if errors:
                    all_errors.append(f"{filename}: {errors}")
                else:
                    total_questions += 20
            else:
                all_errors.append(f"{filename}: FILE NOT FOUND")
    
    print(f"Summary: {found_files}/{total_files} files found, {total_questions} questions")
    if all_errors:
        print(f"\nErrors ({len(all_errors)} files):")
        for error in all_errors[:10]:  # Show first 10
            print(f"  {error}")
        if len(all_errors) > 10:
            print(f"  ... and {len(all_errors) - 10} more")
    else:
        print("✓ All files valid!")
    
    return len(all_errors) == 0

if __name__ == "__main__":
    if len(sys.argv) > 1:
        base_path = sys.argv[1]
    else:
        base_path = "data/exams"
    
    success = validate_all(base_path)
    sys.exit(0 if success else 1)
