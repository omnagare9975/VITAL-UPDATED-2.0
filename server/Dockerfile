# ── VITAL API Server ──────────────────────────────────────────────────────────
# Uses Node.js 20 on Debian (needed to install Python alongside Node)
FROM node:20-bullseye-slim

WORKDIR /app

# ── Install Python 3 (needed for india_check.py and check.py) ─────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create python3 alias
RUN ln -sf /usr/bin/python3 /usr/bin/python

# ── Python deps for India mode (lightweight — stdlib only, no extra pip) ──────
# india_check.py uses only Python stdlib (json, re, os, sys, io).
# No pip install required for India supplements.

# ── Python deps for USA / NIH mode (optional — heavy, ~3 GB with torch) ──────
# Uncomment the block below ONLY if you have the DSLD CSV files in server/
# and want USA NIH supplement recommendations:
#
# RUN pip3 install --no-cache-dir \
#     pandas==2.1.4 \
#     numpy==1.26.2 \
#     Bio-Epidemiology-NER==0.0.6
#
# RUN pip3 install --no-cache-dir \
#     torch --index-url https://download.pytorch.org/whl/cpu
#
# RUN python3 -c "import nltk; nltk.download('punkt_tab')"

# ── Node deps ─────────────────────────────────────────────────────────────────
COPY package*.json ./
RUN npm install --omit=dev

# ── Copy source ───────────────────────────────────────────────────────────────
COPY . .

EXPOSE 3001

# Use node directly (not nodemon) in production
CMD ["node", "server.js"]
