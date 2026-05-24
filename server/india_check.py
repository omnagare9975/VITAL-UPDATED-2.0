import sys
import io
import json
import os
import re

# Force UTF-8 stdout — prevents ₹ from crashing on Windows cp1252
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

os.chdir(os.path.dirname(os.path.abspath(__file__)))

if len(sys.argv) < 4:
    print("Usage: india_check.py <age> <description> <allergies>", file=sys.stderr)
    sys.exit(1)

age_input     = sys.argv[1].strip().lower()
description   = sys.argv[2].strip().lower()
raw_allergies = sys.argv[3].strip().lower()

if not description:
    print("Empty description provided.", file=sys.stderr)
    sys.exit(1)

# ── Load database ─────────────────────────────────────────────────────────────
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

# ── Synonym / lay-term → supplement-keyword mapping ──────────────────────────
# Maps everyday words the user might type → words that appear in healthConditions
SYNONYMS = {
    # Energy / fatigue
    "tired":        ["fatigue", "low energy", "energy"],
    "tiredness":    ["fatigue", "low energy"],
    "exhausted":    ["fatigue", "chronic fatigue"],
    "lethargy":     ["fatigue", "low energy"],
    "weak":         ["fatigue", "muscle weakness", "low stamina"],
    "weakness":     ["fatigue", "muscle weakness"],
    "energy":       ["fatigue", "low energy", "low stamina"],

    # Sleep
    "sleep":        ["insomnia", "sleep disorder"],
    "sleepless":    ["insomnia", "sleep disorder"],
    "insomnia":     ["insomnia", "sleep disorder"],

    # Stress / anxiety
    "stress":       ["stress management", "anxiety disorder"],
    "stressed":     ["stress management", "anxiety disorder"],
    "anxiety":      ["anxiety disorder", "stress management"],
    "anxious":      ["anxiety disorder", "stress management"],
    "nervous":      ["anxiety disorder", "stress management"],
    "calm":         ["stress management", "anxiety disorder"],

    # Digestion
    "digestion":    ["digestive health", "gastrointestinal disorder"],
    "digestive":    ["digestive health", "gastrointestinal disorder"],
    "stomach":      ["digestive health", "gastrointestinal disorder"],
    "gut":          ["digestive health", "gastrointestinal disorder", "gut health"],
    "bloating":     ["digestive health", "gastrointestinal disorder"],
    "bloated":      ["digestive health", "gastrointestinal disorder"],
    "constipation": ["constipation", "digestive health"],
    "acidity":      ["digestive health", "gastrointestinal disorder"],
    "ibs":          ["irritable bowel syndrome", "digestive health"],

    # Immunity
    "immunity":     ["immune system support", "immune deficiency"],
    "immune":       ["immune system support", "immune deficiency"],
    "infection":    ["immune system support", "cold and flu"],
    "cold":         ["cold and flu", "respiratory health", "immune system support"],
    "flu":          ["cold and flu", "immune system support"],
    "fever":        ["immune system support", "cold and flu"],
    "cough":        ["respiratory health", "cold and flu"],

    # Weight
    "weight":       ["weight management", "obesity management"],
    "fat":          ["weight management", "obesity management"],
    "obese":        ["obesity management", "metabolic support"],
    "obesity":      ["obesity management", "metabolic support"],
    "slim":         ["weight management", "obesity management"],
    "lose":         ["weight management", "obesity management"],
    "overweight":   ["obesity management", "metabolic support"],

    # Muscles / fitness
    "muscle":       ["muscle recovery", "muscle building", "protein deficiency"],
    "muscles":      ["muscle recovery", "muscle building"],
    "gym":          ["muscle recovery", "sports performance", "muscle building"],
    "workout":      ["muscle recovery", "sports performance"],
    "protein":      ["protein deficiency", "muscle recovery"],
    "bodybuilding": ["muscle building", "sports performance"],
    "strength":     ["strength training", "muscle building"],
    "stamina":      ["low stamina", "sports performance", "fatigue"],

    # Bones / joints
    "bone":         ["bone health", "calcium deficiency", "osteoporosis risk"],
    "bones":        ["bone health", "calcium deficiency"],
    "joint":        ["joint pain", "arthritis", "joint inflammation"],
    "joints":       ["joint pain", "arthritis", "joint inflammation"],
    "knee":         ["joint pain", "arthritis"],
    "back":         ["joint pain", "arthritis", "back pain"],
    "arthritis":    ["arthritis", "joint inflammation", "joint pain"],
    "calcium":      ["calcium deficiency", "bone health"],

    # Hair / skin / nails
    "hair":         ["hair loss", "alopecia", "biotin deficiency"],
    "hairfall":     ["hair loss", "alopecia"],
    "hairloss":     ["hair loss", "alopecia"],
    "skin":         ["skin health", "dermatitis", "skin inflammation"],
    "acne":         ["acne", "skin health"],
    "glow":         ["skin health", "collagen synthesis"],
    "nails":        ["nail health", "biotin deficiency"],
    "biotin":       ["biotin deficiency", "hair loss"],

    # Heart / blood
    "heart":        ["cardiovascular health", "cardiac support"],
    "cardiac":      ["cardiovascular health", "cardiac support"],
    "cholesterol":  ["cardiovascular health", "cholesterol management"],
    "blood":        ["cardiovascular health", "blood pressure support", "blood sugar support"],
    "pressure":     ["blood pressure support", "cardiovascular health"],
    "sugar":        ["blood sugar support", "diabetes management"],
    "diabetes":     ["diabetes management", "blood sugar support"],
    "diabetic":     ["diabetes management", "blood sugar support"],

    # Brain / memory
    "memory":       ["memory loss", "cognitive impairment", "cognitive function"],
    "focus":        ["cognitive function", "concentration impairment"],
    "brain":        ["cognitive function", "memory loss"],
    "concentration":["concentration impairment", "cognitive function"],
    "mental":       ["cognitive function", "stress management"],

    # Eyes
    "eye":          ["eye health", "macular degeneration risk", "vision support"],
    "eyes":         ["eye health", "vision support"],
    "vision":       ["eye health", "macular degeneration risk"],

    # Vitamins / deficiencies
    "vitamin":      ["vitamin deficiency", "immune support"],
    "deficiency":   ["vitamin deficiency", "iron deficiency", "calcium deficiency"],
    "iron":         ["iron deficiency", "anemia"],
    "anemia":       ["anemia", "iron deficiency"],
    "anaemia":      ["anemia", "iron deficiency"],

    # Liver
    "liver":        ["liver health", "hepatic disorder", "fatty liver"],
    "detox":        ["detox", "liver health", "digestive health"],
    "detoxify":     ["detox", "liver health"],

    # Reproductive / hormonal
    "period":       ["menstrual irregularity", "women's health", "hormonal balance"],
    "pcos":         ["pcos", "hormonal balance", "women's health"],
    "thyroid":      ["hormonal balance", "metabolic support"],
    "hormones":     ["hormonal balance", "women's health"],
    "fertility":    ["reproductive health", "women's health"],
    "libido":       ["male sexual health", "testosterone support"],
    "testosterone": ["testosterone support", "male sexual health"],

    # General
    "improve":      [],   # too generic, ignore
    "better":       [],   # too generic
    "want":         [],
    "need":         [],
    "have":         [],
    "feel":         [],
    "good":         [],
    "help":         [],
    "health":       ["general wellness", "immune system support"],
    "healthy":      ["general wellness", "immune system support"],
    "wellness":     ["general wellness", "immune system support"],
    "boost":        ["immune system support", "low energy"],
    "increase":     [],
}

# ── Stopwords — words too generic to be useful for matching ───────────────────
STOPWORDS = {
    "want", "need", "have", "feel", "like", "more", "better", "good",
    "help", "some", "with", "from", "that", "this", "they", "them",
    "what", "when", "also", "just", "very", "much", "make", "take",
    "improve", "increase", "reduce", "get", "give", "your", "mine",
    "please", "would", "could", "should", "about", "because", "since",
    "does", "will", "been", "were", "than", "then", "into", "only",
    "over", "such", "after", "under", "while", "where", "there",
    "through", "during", "before", "without"
}

# ── Expand description with synonyms ─────────────────────────────────────────
def expand_with_synonyms(desc):
    """Return list of all search terms: original words + synonyms."""
    words = re.split(r'[,\s\-/]+', desc)
    expanded = set()
    for w in words:
        w = w.strip().lower()
        if not w or w in STOPWORDS:
            continue
        if len(w) < 2:
            continue
        expanded.add(w)
        # Add synonyms
        for syn_target in SYNONYMS.get(w, []):
            for t in syn_target.split():
                expanded.add(t.lower())
    return expanded

# ── Build search terms ────────────────────────────────────────────────────────
search_terms = expand_with_synonyms(description)

# Also keep full phrases (comma-separated chunks, min 3 chars)
desc_phrases = [p.strip() for p in description.split(",") if len(p.strip()) >= 3]

# ── Allergen map ─────────────────────────────────────────────────────────────
allergy_ingredients_map = {
    'peanuts':   ['peanut', 'groundnut'],
    'tree nuts': ['nuts', 'walnut', 'almond', 'cashew', 'pistachio'],
    'milk':      ['milk', 'dairy', 'lactose', 'whey', 'casein', 'cheese'],
    'eggs':      ['egg', 'albumin'],
    'fish':      ['fish', 'salmon', 'tuna', 'cod'],
    'shellfish': ['shellfish', 'shrimp', 'crab', 'lobster'],
    'wheat':     ['wheat', 'gluten', 'flour'],
    'soy':       ['soy', 'soybean'],
    'sesame':    ['sesame', 'tahini'],
}

user_allergens = []
if raw_allergies and raw_allergies not in ["none", "null", ""]:
    for item in [x.strip() for x in raw_allergies.split(",") if x.strip()]:
        for key, vals in allergy_ingredients_map.items():
            if item == key or item in vals:
                user_allergens.append(key)
                break

def has_allergen(supplement, allergen_keys):
    ing = supplement.get("ingredients", "").lower()
    for key in allergen_keys:
        for word in allergy_ingredients_map.get(key, [key]):
            if word in ing:
                return True
    return False

# ── Scoring ───────────────────────────────────────────────────────────────────
def score_supplement(supplement):
    conditions     = [c.lower() for c in supplement.get("healthConditions", [])]
    conditions_str = " ".join(conditions)
    desc_text      = supplement.get("description", "").lower()
    name_text      = supplement.get("productName", "").lower()
    category_text  = supplement.get("category", "").lower()
    ingredients_t  = supplement.get("ingredients", "").lower()

    # All supplement text combined for forward matching
    all_supp_text  = f"{conditions_str} {desc_text} {name_text} {category_text}"

    score = 0

    # ── Direction 1: user's expanded terms appear in supplement text ──────────
    for term in search_terms:
        if len(term) < 2:
            continue
        if term in all_supp_text:
            score += 3

    # ── Direction 2: full conditions appear in user's description ─────────────
    # e.g. condition "joint pain" found in description "I have joint pain"
    for condition in conditions:
        if condition in description:
            score += 10           # exact full condition match — high confidence

    # ── Direction 3: individual condition words appear in description ─────────
    # e.g. condition "joint inflammation" → words "joint", "inflammation"
    for condition in conditions:
        cond_words = [w for w in re.split(r'\s+', condition) if len(w) >= 3 and w not in STOPWORDS]
        for cw in cond_words:
            if cw in description:
                score += 4        # single condition word match

    # ── Direction 4: phrase match (comma chunks of description in supp text) ──
    for phrase in desc_phrases:
        if phrase in all_supp_text:
            score += 6

    # ── Direction 5: product name / category in description ───────────────────
    for nw in re.split(r'\s+', name_text):
        if len(nw) >= 3 and nw in description:
            score += 2
    if any(cw in description for cw in re.split(r'\s+', category_text) if len(cw) >= 3):
        score += 2

    # ── Age adjustment ─────────────────────────────────────────────────────────
    if age_input in ["child", "children", "kid", "infant", "toddler", "baby"]:
        form = supplement.get("form", "").lower()
        if any(f in form for f in ["powder", "liquid", "syrup", "drop", "gummy"]):
            score += 5
        if "men's health" in conditions_str or "sports nutrition" in category_text:
            score -= 5

    return score

# ── Score all supplements ──────────────────────────────────────────────────────
scored = []
for supp in supplements:
    if user_allergens and has_allergen(supp, user_allergens):
        continue
    s = score_supplement(supp)
    if s > 0:
        scored.append((s, supp))

# ── Fallback: if NOTHING matched at all, return all supplements sorted by
#    general wellness relevance (so dataset always returns something) ───────────
if not scored:
    # Return general wellness / immunity products as a safe default
    fallback_keywords = {"wellness", "immunity", "immune", "energy", "vitamin", "general"}
    for supp in supplements:
        if user_allergens and has_allergen(supp, user_allergens):
            continue
        conds = " ".join(supp.get("healthConditions", [])).lower()
        if any(kw in conds for kw in fallback_keywords):
            scored.append((1, supp))

# ── If STILL nothing (e.g. all allergen-filtered), exit for Groq fallback ─────
if not scored:
    print("No Indian supplements found after allergen filtering.", file=sys.stderr)
    sys.exit(1)

scored.sort(key=lambda x: x[0], reverse=True)
top_matches = [s[1] for s in scored[:10]]

result = {
    "type": "india",
    "data": top_matches,
    "count": len(top_matches)
}

print(json.dumps(result, ensure_ascii=False))
