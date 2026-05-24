# ── VITAL API Server ──────────────────────────────────────────────────────────
FROM node:20-bullseye-slim

WORKDIR /app

# ── System deps: Python 3 + pip ───────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3 /usr/bin/python

# ── Python packages required by check.py (USA / NIH DSLD mode) ───────────────
# CPU-only torch keeps the image smaller (~500 MB vs ~2 GB for GPU build)
RUN pip3 install --no-cache-dir \
    numpy \
    pandas \
    Bio-Epidemiology-NER==0.0.6

RUN pip3 install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu

# Pre-download NLTK punkt data so the first request doesn't need internet
RUN python3 -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab')"

# ── Node packages ─────────────────────────────────────────────────────────────
COPY package*.json ./
RUN npm install --omit=dev

# ── App source ────────────────────────────────────────────────────────────────
COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
