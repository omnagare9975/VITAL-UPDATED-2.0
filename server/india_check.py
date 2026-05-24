import sys
import io
import json
import os
import re

# Force UTF-8 stdout so ₹ and other Unicode chars don't crash on Windows cp1252
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Always run from the script's own directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Read arguments
# argv[1] = age         e.g. "Adult" or "Child"
# argv[2] = description e.g. "chronic fatigue, low energy"
# argv[3] = allergies   e.g. "fish,dairy" or "none"

if len(sys.argv) < 4:
    print("Usage: india_check.py <age> <description> <allergies>", file=sys.stderr)
    sys.exit(1)

age_input     = sys.argv[1].strip().lower()
description   = sys.argv[2].strip().lower()
raw_allergies = sys.argv[3].strip().lower()

if not description:
    print("Empty description provided.", file=sys.stderr)
    sys.exit(1)

# Load Indian supplement database
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "india_supplements.json")
if not os.path.exists(db_path):
    print("India supplements database not found.", file=sys.stderr)
    sys.exit(1)

try:
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)
    supplements = db.get("supplements", [])
except Exception as e:
    print(f"Error loading India database: {e}", file=sys.stderr)
    sys.exit(1)

# Build search terms from description
desc_words = [w.strip() for w in re.split(r'[,\s]+', description) if len(w.strip()) > 3]
desc_phrases = [p.strip() for p in description.split(",") if len(p.strip()) > 3]

# Parse allergies
allergy_ingredients_map = {
    'peanuts':    ['peanut', 'groundnut'],
    'tree nuts':  ['nuts', 'walnut', 'almond', 'cashew', 'pistachio'],
    'milk':       ['milk', 'dairy', 'lactose', 'whey', 'casein', 'cheese'],
    'eggs':       ['egg', 'albumin'],
    'fish':       ['fish', 'salmon', 'tuna', 'cod'],
    'shellfish':  ['shellfish', 'shrimp', 'crab', 'lobster'],
    'wheat':      ['wheat', 'gluten', 'flour'],
    'soy':        ['soy', 'soybean'],
    'sesame':     ['sesame', 'tahini'],
}

user_allergens = []
if raw_allergies and raw_allergies not in ["none", "null", ""]:
    items = [x.strip() for x in raw_allergies.split(",") if x.strip()]
    for item in items:
        for key, vals in allergy_ingredients_map.items():
            if item == key or item in vals:
                user_allergens.append(key)
                break

def has_allergen(supplement, allergen_keys):
    """Check if supplement contains any of the user's allergens."""
    ingredients_text = supplement.get("ingredients", "").lower()
    for key in allergen_keys:
        for word in allergy_ingredients_map.get(key, [key]):
            if word in ingredients_text:
                return True
    return False

def score_supplement(supplement):
    """Score a supplement based on how well it matches the description."""
    conditions = [c.lower() for c in supplement.get("healthConditions", [])]
    conditions_str = " ".join(conditions)
    desc_text = supplement.get("description", "").lower()
    name_text = supplement.get("productName", "").lower()
    category_text = supplement.get("category", "").lower()

    all_text = f"{conditions_str} {desc_text} {name_text} {category_text}"

    score = 0

    # Match full description against conditions
    for condition in conditions:
        if condition in description:
            score += 10

    # Match description phrases against supplement text
    for phrase in desc_phrases:
        if phrase in all_text:
            score += 5

    # Match individual words
    for word in desc_words:
        if word in all_text:
            score += 2

    # Age-based scoring
    if age_input in ["child", "children", "kid", "infant", "toddler"]:
        form = supplement.get("form", "").lower()
        if form in ["powder", "liquid", "syrup"]:
            score += 5
        # Penalize adult-focused supplements
        if "men's health" in conditions_str or "sports nutrition" in supplement.get("category", "").lower():
            score -= 3

    return score

# Score and filter supplements
scored = []
for supp in supplements:
    # Skip if contains allergen
    if user_allergens and has_allergen(supp, user_allergens):
        continue

    score = score_supplement(supp)
    if score > 0:
        scored.append((score, supp))

# Sort by score descending
scored.sort(key=lambda x: x[0], reverse=True)

if not scored:
    print("No Indian supplements found matching your description.", file=sys.stderr)
    sys.exit(1)

# Return top 10 matches
top_matches = [s[1] for s in scored[:10]]

result = {
    "type": "india",
    "data": top_matches,
    "count": len(top_matches)
}

print(json.dumps(result, ensure_ascii=False))
