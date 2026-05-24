"""
check_simple.py  –  Lightweight USA supplement search
  Uses keyword + synonym matching on NIH DSLD CSV data.
  No NER, no torch, no BERT — only pandas + stdlib.
  Falls back to this when check.py (NER mode) runs out of memory.

Args:
  argv[1] = age           e.g. "Adult"
  argv[2] = brand         e.g. "Vega"
  argv[3] = market_only   e.g. "False"
  argv[4] = description   e.g. "joint pain build muscle"
  argv[5] = allergies     e.g. "fish,dairy" or "none"
"""
import sys
import json
import os
import re
import pandas as pd

os.chdir(os.path.dirname(os.path.abspath(__file__)))

if len(sys.argv) < 6:
    print("Usage: check_simple.py <age> <brand> <market_only> <description> <allergies>",
          file=sys.stderr)
    sys.exit(1)

age_input     = sys.argv[1].strip().lower()
brand_input   = sys.argv[2].strip()
market_only   = sys.argv[3].strip().lower() == "true"
description   = sys.argv[4].strip().lower()
raw_allergies = sys.argv[5].strip().lower()

if not description:
    print("Empty description.", file=sys.stderr)
    sys.exit(1)

# ── Synonym map (same as india_check.py) ─────────────────────────────────────
SYNONYMS = {
    "tired": ["fatigue", "energy", "stamina"], "tiredness": ["fatigue"],
    "exhausted": ["fatigue", "chronic fatigue"], "weak": ["fatigue", "weakness"],
    "energy": ["fatigue", "stamina", "vitality"],
    "sleep": ["insomnia", "sleep"], "sleepless": ["insomnia"],
    "stress": ["stress", "anxiety"], "anxious": ["anxiety", "stress"],
    "digestion": ["digestive", "gastrointestinal"], "stomach": ["digestive", "gastrointestinal"],
    "gut": ["digestive", "gastrointestinal", "probiotic"],
    "bloating": ["digestive", "bloating"], "constipation": ["constipation", "digestive"],
    "immunity": ["immune", "immunity"], "immune": ["immune", "immunity"],
    "cold": ["cold", "flu", "immune"], "flu": ["flu", "immune"],
    "weight": ["weight", "obesity", "metabolic"], "fat": ["weight", "obesity"],
    "lose": ["weight", "obesity"], "slim": ["weight", "obesity"],
    "muscle": ["muscle", "protein", "amino"], "muscles": ["muscle", "protein"],
    "gym": ["muscle", "performance", "protein"], "workout": ["muscle", "recovery"],
    "protein": ["protein", "amino"], "strength": ["strength", "muscle"],
    "stamina": ["stamina", "energy", "performance"],
    "bone": ["bone", "calcium", "osteoporosis"], "bones": ["bone", "calcium"],
    "joint": ["joint", "arthritis", "inflammation"], "joints": ["joint", "arthritis"],
    "knee": ["joint", "arthritis"], "arthritis": ["arthritis", "joint", "inflammation"],
    "calcium": ["calcium", "bone"],
    "hair": ["hair", "biotin"], "hairloss": ["hair", "biotin", "alopecia"],
    "skin": ["skin", "collagen", "dermatitis"], "acne": ["acne", "skin"],
    "heart": ["cardiovascular", "cardiac", "heart"],
    "cholesterol": ["cholesterol", "cardiovascular"],
    "blood": ["blood", "cardiovascular", "circulatory"],
    "sugar": ["blood sugar", "glucose", "diabetes"], "diabetes": ["diabetes", "glucose"],
    "memory": ["memory", "cognitive", "brain"],
    "focus": ["cognitive", "concentration", "brain"],
    "brain": ["cognitive", "brain", "memory"],
    "eye": ["eye", "vision", "macular"], "eyes": ["eye", "vision"],
    "vitamin": ["vitamin", "deficiency"], "iron": ["iron", "anemia"],
    "anemia": ["anemia", "iron"], "liver": ["liver", "hepatic"],
    "detox": ["detox", "liver", "cleanse"],
    "build": ["muscle", "protein", "strength"],
    "improve": [], "better": [], "want": [], "need": [], "have": [], "feel": [],
    "health": ["health", "wellness"], "healthy": ["health", "wellness"],
    "boost": ["immune", "energy"], "increase": [],
}

STOPWORDS = {
    "want","need","have","feel","like","more","better","good","help","some","with",
    "from","that","this","they","them","what","when","also","just","very","much",
    "make","take","improve","increase","reduce","get","give","your","mine","please",
    "would","could","should","about","does","will","been","were","than","then",
    "into","only","over","such","after","under","while","where","there"
}

def expand(desc):
    words = re.split(r'[,\s\-/]+', desc)
    terms = set()
    for w in words:
        w = w.strip().lower()
        if not w or w in STOPWORDS or len(w) < 2:
            continue
        terms.add(w)
        for t in SYNONYMS.get(w, []):
            for part in t.split():
                terms.add(part.lower())
    return terms

search_terms = expand(description)

# ── Load CSV files ────────────────────────────────────────────────────────────
for fname in ["LabelStatements_1.csv", "LabelStatements_2.csv",
              "ProductOverview_1.csv",  "ProductOverview_2.csv"]:
    if not os.path.exists(fname):
        print(f"CSV not found: {fname}", file=sys.stderr)
        sys.exit(1)

try:
    sup_1    = pd.read_csv("LabelStatements_1.csv",  engine="python", on_bad_lines="skip")
    sup_2    = pd.read_csv("LabelStatements_2.csv",  engine="python", on_bad_lines="skip")
    prov_1   = pd.read_csv("ProductOverview_1.csv",  engine="python", on_bad_lines="skip")
    prov_2   = pd.read_csv("ProductOverview_2.csv",  engine="python", on_bad_lines="skip")
except Exception as e:
    print(f"CSV load error: {e}", file=sys.stderr)
    sys.exit(1)

sup_merged  = pd.concat([sup_1, sup_2],   ignore_index=True, sort=False)
prov_merged = pd.concat([prov_1, prov_2], ignore_index=True, sort=False)

# Keep only "Other" label statements
sup_merged = sup_merged[sup_merged["Statement Type"] == "Other"]
sup_merged["Statement"] = sup_merged["Statement"].fillna("").astype(str)

# Merge products with statements
full = pd.merge(prov_merged, sup_merged, how="right", on=["URL", "DSLD ID", "Product Name"])
full["Statement"] = full["Statement"].fillna("").astype(str)

# ── Try to load OtherIngredients for allergy filtering ────────────────────────
other_ing = None
try:
    if os.path.exists("OtherIngredients_1.csv") and os.path.exists("OtherIngredients_2.csv"):
        oi1 = pd.read_csv("OtherIngredients_1.csv", engine="python", on_bad_lines="skip")
        oi2 = pd.read_csv("OtherIngredients_2.csv", engine="python", on_bad_lines="skip")
        other_ing = pd.concat([oi1, oi2], ignore_index=True, sort=False)
        full = pd.merge(full, other_ing, how="left", on=["URL", "DSLD ID", "Product Name"])
except Exception:
    pass

# ── Keyword match against Statement column ────────────────────────────────────
matched = pd.DataFrame()

for term in search_terms:
    if len(term) < 2:
        continue
    try:
        hits = full[full["Statement"].str.contains(re.escape(term), case=False, na=False)]
        if not hits.empty:
            matched = pd.concat([matched, hits], ignore_index=True)
    except Exception:
        continue

# Also match phrases from description (comma-separated)
for phrase in [p.strip() for p in description.split(",") if len(p.strip()) >= 3]:
    try:
        hits = full[full["Statement"].str.contains(re.escape(phrase), case=False, na=False)]
        if not hits.empty:
            matched = pd.concat([matched, hits], ignore_index=True)
    except Exception:
        continue

if matched.empty:
    print("No supplements found for description.", file=sys.stderr)
    sys.exit(1)

matched = matched.drop_duplicates()

# ── Age filter ────────────────────────────────────────────────────────────────
is_child = age_input in ["child", "children", "kid", "infant", "toddler", "baby", "false"]
if is_child and "Supplement Form [LanguaL]" in matched.columns:
    child_forms = ["Powder", "Liquid", "Gummy"]
    child_df = pd.DataFrame()
    for form in child_forms:
        hits = matched[matched["Supplement Form [LanguaL]"].str.contains(form, case=False, na=False)]
        child_df = pd.concat([child_df, hits], ignore_index=True)
    if not child_df.empty:
        rest = matched[~matched.index.isin(child_df.index)]
        matched = pd.concat([child_df, rest], ignore_index=True).drop_duplicates()

# ── Brand preference ──────────────────────────────────────────────────────────
if brand_input.lower() not in ["nan", "none", ""] and "Brand Name" in matched.columns:
    branded = matched[matched["Brand Name"].str.contains(brand_input, case=False, na=False)]
    rest    = matched[~matched.index.isin(branded.index)]
    matched = pd.concat([branded, rest], ignore_index=True).drop_duplicates()

# ── Allergy filter ────────────────────────────────────────────────────────────
ALLERGEN_MAP = {
    "peanuts":   ["peanut","groundnut"],
    "milk":      ["milk","dairy","lactose","whey","casein"],
    "eggs":      ["egg","albumin"],
    "fish":      ["fish","salmon","tuna","cod"],
    "shellfish": ["shellfish","shrimp","crab","lobster"],
    "wheat":     ["wheat","gluten"],
    "soy":       ["soy","soybean"],
    "tree nuts": ["nuts","walnut","almond","cashew"],
    "sesame":    ["sesame","tahini"],
}

if raw_allergies not in ["none", "null", ""] and "Other Ingredients" in matched.columns:
    matched["Other Ingredients"] = matched["Other Ingredients"].fillna("").astype(str)
    for item in raw_allergies.split(","):
        item = item.strip()
        for key, words in ALLERGEN_MAP.items():
            if item in [key] + words:
                for w in words:
                    try:
                        matched = matched[~matched["Other Ingredients"].str.contains(
                            re.escape(w), case=False, na=False)]
                    except Exception:
                        pass

# ── Limit and output ──────────────────────────────────────────────────────────
if len(matched) > 500:
    matched = matched.head(500)
if matched.shape[1] > 30:
    matched = matched.iloc[:, :30]

matched = matched.where(pd.notnull(matched), None)

try:
    result = matched.to_json(orient="split")
    parsed = json.loads(result)
    print(json.dumps(parsed, indent=2))
except Exception as e:
    print(f"Serialization error: {e}", file=sys.stderr)
    sys.exit(1)
