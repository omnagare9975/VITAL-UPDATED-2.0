# ── VITAL API Server ──────────────────────────────────────────────────────────
FROM node:20-bullseye-slim

WORKDIR /app

# ── System deps ───────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3 /usr/bin/python

# ── Python packages ───────────────────────────────────────────────────────────
RUN pip3 install --no-cache-dir numpy pandas

RUN pip3 install --no-cache-dir Bio-Epidemiology-NER==0.0.6

RUN pip3 install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu

# ── NLTK data — download to /root/nltk_data so it is always found at runtime ─
ENV NLTK_DATA=/root/nltk_data
RUN python3 -c "\
import nltk; \
nltk.download('punkt',     download_dir='/root/nltk_data'); \
nltk.download('punkt_tab', download_dir='/root/nltk_data'); \
nltk.download('averaged_perceptron_tagger', download_dir='/root/nltk_data'); \
nltk.download('averaged_perceptron_tagger_eng', download_dir='/root/nltk_data'); \
print('NLTK downloads complete')"

# ── Pre-load the NER model so HuggingFace weights are cached in the image ─────
# This avoids a slow first-request model download at runtime.
RUN python3 -c "\
import sys; sys.stdout = sys.stderr; \
from Bio_Epidemiology_NER.bio_recognizer import ner_prediction; \
ner_prediction('CASE: fatigue', compute='cpu'); \
print('NER model warm-up complete')" || echo "NER warm-up skipped (non-fatal)"

# ── Node packages ─────────────────────────────────────────────────────────────
COPY package*.json ./
RUN npm install --omit=dev

# ── App source (includes CSV files — .dockerignore no longer excludes them) ───
COPY . .

EXPOSE 3001
CMD ["node", "server.js"]
