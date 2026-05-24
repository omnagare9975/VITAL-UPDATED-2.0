import sys
import json
import os
import re

# ── Silence ALL stdout pollution before importing heavy libraries ─────────────
# NLTK, transformers, and torch all print messages to stdout (not stderr).
# Node.js captures stdout and tries JSON.parse() on it — any prefix text breaks that.
# We redirect stdout → stderr during imports, then restore it for the final JSON.
_real_stdout = sys.stdout
sys.stdout = sys.stderr

import numpy as np
import pandas as pd
from Bio_Epidemiology_NER.bio_recognizer import ner_prediction

# Restore real stdout — only JSON will be written here
sys.stdout = _real_stdout

# ── CRITICAL: Always run from the script's own directory ──────────────────────
os.chdir(os.path.dirname(os.path.abspath(__file__)))

pd.set_option('display.max_colwidth', 20)

# ── Read arguments ─────────────────────────────────────────────────────────────
# argv[1] = age         e.g. "Adult"
# argv[2] = brand       e.g. "Vega"
# argv[3] = market_only e.g. "False"
# argv[4] = description e.g. "chronic fatigue, low energy"
# argv[5] = allergies   e.g. "fish,dairy" or "none"

if len(sys.argv) < 6:
    print("Usage: check.py <age> <brand> <market_only> <description> <allergies>", file=sys.stderr)
    sys.exit(1)

age_input     = sys.argv[1].strip()
brand_input   = sys.argv[2].strip()
market_only   = sys.argv[3].strip().lower() == "true"
description   = sys.argv[4].strip()
raw_allergies = sys.argv[5].strip().lower()

# ── Guard: empty description ──────────────────────────────────────────────────
if not description:
    print("Empty description provided.", file=sys.stderr)
    sys.exit(1)

# ── Run NER ────────────────────────────────────────────────────────────────────
doc = f"CASE: {description}"

try:
    analysed = ner_prediction(corpus=doc, compute='cpu')
except Exception as e:
    print(f"NER prediction failed: {e}", file=sys.stderr)
    sys.exit(1)

# Guard: NER returned nothing
if analysed is None or analysed.empty:
    print("NER returned no entities. Please be more specific.", file=sys.stderr)
    sys.exit(1)

# ── Filter NER entities ────────────────────────────────────────────────────────
analysed_filtered_DPBS = analysed[
    analysed["entity_group"].isin(["Diagnostic_procedure", "Biological_structure"])
]
analysed_filtered_SSLV = analysed[
    analysed["entity_group"].isin(["Sign_symptom", "Lab_value"])
]

# Use ALL entity groups combined for maximum matching coverage
all_entities = pd.concat([analysed_filtered_DPBS, analysed_filtered_SSLV], ignore_index=True)

# If combined is still empty, try ALL entity groups as last resort
if all_entities.empty:
    all_entities = analysed.copy()

if all_entities.empty:
    print("No relevant medical entities found.", file=sys.stderr)
    sys.exit(1)

# ── Load CSV datasets ──────────────────────────────────────────────────────────
csv_files = {
    "LabelStatements_1.csv":  None,
    "LabelStatements_2.csv":  None,
    "ProductOverview_1.csv":  None,
    "ProductOverview_2.csv":  None,
    "OtherIngredients_1.csv": None,
    "OtherIngredients_2.csv": None,
}

for fname in csv_files:
    if not os.path.exists(fname):
        print(f"CSV file not found: {fname}", file=sys.stderr)
        sys.exit(1)

try:
    sup_1    = pd.read_csv("LabelStatements_1.csv",  engine='python', on_bad_lines='skip')
    sup_2    = pd.read_csv("LabelStatements_2.csv",  engine='python', on_bad_lines='skip')
    prover_1 = pd.read_csv("ProductOverview_1.csv",  engine='python', on_bad_lines='skip')
    prover_2 = pd.read_csv("ProductOverview_2.csv",  engine='python', on_bad_lines='skip')
    othing_1 = pd.read_csv("OtherIngredients_1.csv", engine='python', on_bad_lines='skip')
    othing_2 = pd.read_csv("OtherIngredients_2.csv", engine='python', on_bad_lines='skip')
except Exception as e:
    print(f"Error loading CSV: {e}", file=sys.stderr)
    sys.exit(1)

# ── Merge datasets ─────────────────────────────────────────────────────────────
sup_merged    = pd.concat([sup_1, sup_2],       ignore_index=True, sort=False)
prover_merged = pd.concat([prover_1, prover_2], ignore_index=True, sort=False)
othing_merged = pd.concat([othing_1, othing_2], ignore_index=True, sort=False)

# Keep only "Other" type label statements
sup_merged = sup_merged[sup_merged["Statement Type"] == "Other"]

full_merged = pd.merge(prover_merged, sup_merged,   how="right", on=["URL", "DSLD ID", "Product Name"])
full_merged = pd.merge(full_merged,  othing_merged,  how="right", on=["URL", "DSLD ID", "Product Name"])

# Ensure Statement column is clean string
full_merged["Statement"] = full_merged["Statement"].fillna("").astype(str)

# ── Match entities against supplement statements ───────────────────────────────
analysed_df = pd.DataFrame()

for _, row in all_entities.iterrows():
    entity_val = str(row.get('value', '')).strip()
    if not entity_val or len(entity_val) < 2:
        continue
    try:
        matched = full_merged[
            full_merged["Statement"].str.contains(
                re.escape(entity_val), na=False, case=False
            )
        ]
        if not matched.empty:
            analysed_df = pd.concat([analysed_df, matched], ignore_index=True)
    except Exception:
        continue

# Also try matching individual words from the description for broader coverage
# This catches cases where NER misses some terms
desc_keywords = [w.strip() for w in re.split(r'[,\s]+', description) if len(w.strip()) > 4]
for keyword in desc_keywords:
    try:
        matched = full_merged[
            full_merged["Statement"].str.contains(
                re.escape(keyword), na=False, case=False
            )
        ]
        if not matched.empty:
            analysed_df = pd.concat([analysed_df, matched], ignore_index=True)
    except Exception:
        continue

# Remove duplicates
if not analysed_df.empty:
    analysed_df = analysed_df.drop_duplicates()

if analysed_df.empty:
    print("No supplements found matching your description.", file=sys.stderr)
    sys.exit(1)

# ── Age-based form preference ──────────────────────────────────────────────────
age_lower = age_input.lower()
is_child  = age_lower in ["child", "children", "kid", "infant", "toddler", "baby"]

if is_child:
    child_forms = ['Powder', 'Liquid', 'Gummy or Jelly']
    child_df    = pd.DataFrame()

    for form in child_forms:
        matched = analysed_df[
            analysed_df["Supplement Form [LanguaL]"].str.contains(form, case=False, na=False)
        ]
        child_df = pd.concat([child_df, matched], ignore_index=True)

    remaining   = analysed_df[~analysed_df.index.isin(child_df.index)]
    analysed_df = pd.concat([child_df, remaining], ignore_index=True).drop_duplicates()

# ── Brand preference ───────────────────────────────────────────────────────────
brand_name = brand_input.strip()
if brand_name.lower() not in ["nan", "none", ""]:
    branded_df  = analysed_df[
        analysed_df["Brand Name"].str.contains(brand_name, case=False, na=False)
    ]
    rest_df     = analysed_df[~analysed_df.index.isin(branded_df.index)]
    analysed_df = pd.concat([branded_df, rest_df], ignore_index=True).drop_duplicates()

# ── Market status filter ───────────────────────────────────────────────────────
if market_only:
    on_market = analysed_df[
        analysed_df["Market Status"].str.contains("On Market", case=False, na=False)
    ]
    if not on_market.empty:
        analysed_df = on_market

# ── Allergy filtering ──────────────────────────────────────────────────────────
allergic_food_dict = {
    'peanuts':    ['peanut', 'peanuts', 'groundnut'],
    'tree nuts':  ['nuts', 'walnuts', 'almonds', 'cashews', 'pistachios', 'pecans', 'hazelnuts', 'macadamia', 'brazil nut'],
    'milk':       ['cheese', 'butter', 'yogurt', 'milk', 'dairy', 'lactose', 'whey', 'casein'],
    'eggs':       ['chicken', 'egg', 'eggs', 'albumin'],
    'fish':       ['fish', 'salmon', 'tuna', 'halibut', 'cod', 'tilapia', 'bass', 'flounder'],
    'shellfish':  ['shellfish', 'shrimp', 'crab', 'lobster', 'mussel', 'oyster', 'clam', 'scallop'],
    'wheat':      ['bread', 'wheat', 'pasta', 'baked', 'gluten', 'flour'],
    'soy':        ['soy', 'tofu', 'soybean', 'edamame', 'miso'],
    'mustard':    ['mustard', 'mustard seed'],
    'sesame':     ['sesame', 'sesame oil', 'sesame seed', 'tahini'],
    'celery':     ['celery'],
    'sulfites':   ['sulfite', 'sulphite', 'sulfur dioxide'],
    'lupin':      ['lupin', 'lupine'],
    'mollusks':   ['octopus', 'squid', 'cuttlefish', 'mollusk'],
    'kiwi':       ['kiwi'],
    'pineapple':  ['pineapple'],
    'avocado':    ['avocado', 'guacamole'],
    'banana':     ['banana'],
    'strawberry': ['strawberry', 'strawberries'],
    'tomato':     ['tomato'],
}

# Parse allergies argument
allergy_list = []
if raw_allergies and raw_allergies not in ["none", "null", ""]:
    inp_items = [x.strip() for x in raw_allergies.split(",") if x.strip()]
    for user_val in inp_items:
        # Direct key match
        if user_val in allergic_food_dict:
            if user_val not in allergy_list:
                allergy_list.append(user_val)
            continue
        # Value match
        for key, val_list in allergic_food_dict.items():
            if user_val in [v.lower() for v in val_list]:
                if key not in allergy_list:
                    allergy_list.append(key)
                break

# Apply allergy filters
if allergy_list and "Other Ingredients" in analysed_df.columns:
    analysed_df["Other Ingredients"] = analysed_df["Other Ingredients"].fillna("").astype(str)
    for allergen_key in allergy_list:
        words_to_filter = allergic_food_dict.get(allergen_key, [allergen_key])
        for word in words_to_filter:
            try:
                mask        = analysed_df["Other Ingredients"].str.contains(
                    re.escape(word), case=False, na=False
                )
                analysed_df = analysed_df[~mask]
            except Exception:
                continue

    if analysed_df.empty:
        print("No supplements found after applying allergy filters.", file=sys.stderr)
        sys.exit(1)

# ── Limit output size ──────────────────────────────────────────────────────────
MAX_ROWS = 500
MAX_COLS = 30

if len(analysed_df) > MAX_ROWS:
    analysed_df = analysed_df.head(MAX_ROWS)

if analysed_df.shape[1] > MAX_COLS:
    analysed_df = analysed_df.iloc[:, :MAX_COLS]

# ── Clean up NaN values so JSON serialization never fails ─────────────────────
analysed_df = analysed_df.where(pd.notnull(analysed_df), None)

# ── Serialize and print ────────────────────────────────────────────────────────
try:
    result = analysed_df.to_json(orient="split")
    parsed = json.loads(result)
    print(json.dumps(parsed, indent=2))
except Exception as e:
    print(f"Failed to serialize results: {e}", file=sys.stderr)
    sys.exit(1)