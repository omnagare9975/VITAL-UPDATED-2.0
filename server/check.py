import sys
import json
import numpy as np
import pandas as pd
from Bio_Epidemiology_NER.bio_recognizer import ner_prediction

pd.set_option('display.max_colwidth', 20)

# Read input argument
pa = sys.argv[4]
doc = f"""
    CASE: {pa}
"""

# Run Named Entity Recognition (NER)
analysed = ner_prediction(corpus=doc, compute='cpu')

if analysed.shape == (0, 0):
    print("Cannot analyse your status: Please be more specific!")
    sys.exit("args: {}".format(analysed.shape))

# Filtering data based on entity groups
analysed_filtered_DPBS = analysed[
    (analysed["entity_group"] == "Diagnostic_procedure") |
    (analysed["entity_group"] == "Biological_structure")
]
analysed_filtered_SSLV = analysed[
    (analysed["entity_group"] == "Sign_symptom") |
    (analysed["entity_group"] == "Lab_value")
]

# Load CSV files
sup_1 = pd.read_csv("LabelStatements_1.csv", engine='python')
sup_2 = pd.read_csv("LabelStatements_2.csv", engine="python")
prover_1 = pd.read_csv("ProductOverview_1.csv", engine="python")
prover_2 = pd.read_csv("ProductOverview_2.csv", engine="python")
othing_1 = pd.read_csv("OtherIngredients_1.csv", engine="python")
othing_2 = pd.read_csv("OtherIngredients_2.csv", engine="python")

# Merge data
sup_frame = [sup_1, sup_2]
prover_frame = [prover_1, prover_2]
othing_frame = [othing_1, othing_2]

sup_merged = pd.concat(sup_frame, ignore_index=True, sort=False)
prover_merged = pd.concat(prover_frame, ignore_index=True, sort=False)
othing_merged = pd.concat(othing_frame, ignore_index=True, sort=False)

# Filter statements
sup_merged = sup_merged[sup_merged["Statement Type"] == "Other"]
full_merged = pd.merge(prover_merged, sup_merged, how="right", on=["URL", "DSLD ID", "Product Name"])
full_merged = pd.merge(full_merged, othing_merged, how="right", on=["URL", "DSLD ID", "Product Name"])

# Initialize DataFrame
analysed_df = pd.DataFrame()

# Filter by Diagnostic Procedure
for _, row in analysed_filtered_DPBS.iterrows():
    analysed_df = pd.concat([
        analysed_df,
        full_merged[full_merged["Statement"].str.contains(row['value'], na=False)]
    ])

if analysed_df.shape == (0, 0):
    print("No supplements available that satisfy your requirements")
    sys.exit("Bailing out of the program.")

# Age-based filtering
if not sys.argv[1]:  # Assuming no age input
    child_rec = pd.DataFrame({'Supplement Form [LanguaL]': ['Powder', 'Liquid', 'Gummy or Jelly']})
    new_df = pd.DataFrame()
    analysed_df_copy = analysed_df.copy()

    for _, row in child_rec.iterrows():
        new_df = pd.concat([
            new_df,
            analysed_df[analysed_df["Supplement Form [LanguaL]"].str.contains(row['Supplement Form [LanguaL]'], case=False)]
        ])

    analysed_df = pd.concat([new_df, analysed_df_copy.loc[~analysed_df_copy.index.isin(new_df.index)]], axis=0)

# Brand preference filtering
if sys.argv[2] != 'Nan':
    age_flag = False
    brand_rec = pd.DataFrame({'Brand Name': ['vega']})

    new_df = pd.DataFrame()
    analysed_df_copy = analysed_df.copy()

    for _, row in brand_rec.iterrows():
        new_df = pd.concat([
            new_df,
            analysed_df[analysed_df["Brand Name"].str.contains(row['Brand Name'], case=False)]
        ])

    if 5 <= 6:  # Assuming a condition that evaluates to True
        age_flag = True
        child_rec = pd.DataFrame({'Supplement Form [LanguaL]': ['Liquid', 'Powder', 'Gummy or Jelly']})
        new_df_2 = pd.DataFrame()

        for _, row in child_rec.iterrows():
            new_df_2 = pd.concat([
                new_df_2,
                new_df[new_df["Supplement Form [LanguaL]"].str.contains(row['Supplement Form [LanguaL]'], case=False)]
            ])

if age_flag:
    analysed_df = pd.concat([new_df_2, analysed_df_copy.loc[~analysed_df_copy.index.isin(new_df_2.index)]], axis=0)
else:
    analysed_df = pd.concat([new_df, analysed_df_copy.loc[~analysed_df_copy.index.isin(new_df.index)]], axis=0)

# Market Status filtering
if sys.argv[3]:
    on_rec = pd.DataFrame({'Market Status': ['On Market']})
    new_df = pd.DataFrame()

    for _, row in on_rec.iterrows():
        new_df = pd.concat([
            new_df,
            analysed_df[analysed_df["Market Status"].str.contains(row['Market Status'], case=False)]
        ])
    
    analysed_df = new_df  

# Process allergies
inp = sys.argv[5].replace(" ", "").split(",")

allergic_food_dict = {
    'peanuts': ['peanuts'],
    'nuts': ['nuts', 'Walnuts', 'almonds', 'cashews', 'pistachios', 'pecans', 'hazelnuts'],
    'milk': ['cheese', 'butter', 'yogurt', 'milk', 'dairy'],
    'eggs': ['chicken', 'egg', 'eggs'],
    'fish': ['fish', 'salmon', 'tuna', 'halibut'],
    'shellfish': ['shellfish', 'shrimp', 'crab', 'lobster', 'mussel'],
    'wheat': ['bread', 'wheat', 'pasta', 'baked'],
    'soy': ['soy', 'tofu'],
    'mustard': ['mustard', 'mustard seed'],
    'sesame': ['sesame', 'sesame oil', 'sesame seed'],
    'celery': ['celery'],
    'sulfites': ['sulfite'],
    'lupin': ['lupin'],
    'mollusks': ['octopus', 'squid', 'cuttlefish'],
    'kiwi': ['kiwi'],
    'pineapple': ['pineapple'],
    'avocado': ['avocado', 'guacamole'],
    'banana': ['banana'],
    'strawberries': ['strawberry'],
    'tomato': ['tomato']
}

allergy_list = []
if inp:
    for values in ["milk", "egg", "fish"]:
        for key, val in allergic_food_dict.items():
            if values in val:
                allergy_list.append(key)

final_tab_copy = analysed_df.copy()
flag = True

for _, row in analysed_df.iterrows():
    for key in allergy_list:
        if flag:
            flag = False
            final_tab_copy = analysed_df.loc[
                ~analysed_df["Other Ingredients"].str.contains(key, case=False, na=False)
            ]
        else:
            final_tab_copy = pd.concat([
                final_tab_copy,
                analysed_df.loc[
                    ~analysed_df["Other Ingredients"].str.contains(key, case=False, na=False)
                ]
            ], join="inner", axis=0)

analysed_df = final_tab_copy

# Convert DataFrame to JSON
result = analysed_df.to_json(orient="split")
parsed = json.loads(result)
print(json.dumps(parsed, indent=4))
