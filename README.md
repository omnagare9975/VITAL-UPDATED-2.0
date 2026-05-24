# VITAL — AI-Powered Supplement Recommendation System

> Personalized dietary supplement recommendations powered by NIH DSLD data (USA) and curated Indian Ayurvedic/nutraceutical database.

## 🌟 Features

| Feature | Description |
|---------|-------------|
| 🇺🇸 **USA Supplements** | NIH DSLD database with 80,000+ US supplement labels via NER + Bio-Epidemiology-NER |
| 🇮🇳 **India Supplements** | 60+ curated Indian products from Himalaya, Dabur, Patanjali, MuscleBlaze, Oziva and more |
| 🤖 **AI-Powered** | Groq LLaMA 3.3-70B normalization (fallback only — dataset searched first) |
| 🛡️ **Allergy Filtering** | Automatic allergen detection and exclusion |
| 💊 **Supplement Comparison** | Side-by-side comparison of up to 3 Indian supplements |
| 📊 **BMI Calculator** | BMI calculation with personalized supplement suggestions |
| 👤 **Profile Management** | Edit name, phone, DOB; change password |
| 📋 **Assessment History** | Search, filter, and delete past health assessments |
| 🖨️ **Print/Export** | Print recommendations with a single click |
| 🔧 **Admin Panel** | System statistics (users, assessments, country breakdown) |

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌───────────────────────┐
│  React Client   │─────▶│  Express Server  │─────▶│  MongoDB Atlas        │
│  (port 3000)    │      │  (port 3001)     │      │  (Users, Questions)   │
└─────────────────┘      └────────┬─────────┘      └───────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
              ┌─────▼──────┐              ┌──────▼──────┐
              │ check.py   │              │india_check.py│
              │ USA + NER  │              │ India JSON   │
              └─────┬──────┘              └──────┬──────┘
                    │                             │
              ┌─────▼──────┐              ┌──────▼──────┐
              │ NIH DSLD   │              │india_supple- │
              │  CSVs      │              │ments.json    │
              └────────────┘              └─────────────┘
```

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- Python 3.10
- MongoDB Atlas account
- Groq API key (free at console.groq.com)

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd VITAL-UPDATED-2.0

# 2. Set up server environment
cd server
cp .env.example .env
# Fill in MONGODBURL, JWT_SECRET, GROQ_API_KEY

# 3. Install server dependencies
npm install

# 4. Install Python dependencies
pip install Bio-Epidemiology-NER==0.0.6 pandas numpy torch
python -c "import nltk; nltk.download('punkt_tab')"

# 5. Download NIH DSLD CSV files and place in server/
# Required: LabelStatements_1.csv, LabelStatements_2.csv,
#           ProductOverview_1.csv, ProductOverview_2.csv,
#           OtherIngredients_1.csv, OtherIngredients_2.csv
# Download from: https://dsld.od.nih.gov/

# 6. Install client dependencies
cd ../client
npm install
cp .env.example .env
# (optional) set REACT_APP_API_URL if different from localhost:3001
```

### Running (3 terminals)

```bash
# Terminal 1 — API Server
cd server && npm start

# Terminal 2 — PDF Proxy
npm start  (from root)

# Terminal 3 — React Client
cd client && npm start
```

App available at: http://localhost:3000

## ☁️ Deployment

### Backend → Render.com

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Select your repo — Render auto-detects `render.yaml`
4. Add environment variables in Render dashboard:
   - `MONGODBURL`
   - `JWT_SECRET`
   - `GROQ_API_KEY`
   - `CLIENT_URL` → your Vercel frontend URL

> ⚠️ Note: Python NER (for USA supplements) requires the NIH CSV files to be present in the server directory. For pure India-mode deployment, only Node.js is needed.

### Frontend → Vercel

```bash
cd client
npm run build
# Deploy via Vercel CLI or push to GitHub and connect repo on vercel.com
```

Set environment variable in Vercel:
- `REACT_APP_API_URL` → your Render API URL (e.g. `https://vital-api.onrender.com`)
- `REACT_APP_PDF_PROXY_URL` → your Render proxy URL

## 📁 Project Structure

```
VITAL-UPDATED-2.0/
├── client/                          # React 18 frontend
│   ├── src/
│   │   ├── api/                     # API clients (config.js, auth.js, question.js, user.js)
│   │   ├── components/
│   │   │   ├── landing/             # Public homepage
│   │   │   ├── login/               # Login page
│   │   │   ├── register/            # Registration page
│   │   │   ├── form/                # 5-step health questionnaire
│   │   │   ├── recommendation/      # Results + comparison + print
│   │   │   ├── mainpage/            # Dashboard + search/filter
│   │   │   ├── mainpage_details/    # Saved recommendation viewer
│   │   │   ├── profile/             # User profile editor
│   │   │   ├── bmi/                 # BMI Calculator
│   │   │   ├── admin/               # Admin statistics panel
│   │   │   ├── navbar/              # Sticky navbar
│   │   │   └── notfound/            # 404 page
│   │   ├── features/userSlice.js    # Redux auth state
│   │   └── App.js                   # Router
│   ├── vercel.json                  # Vercel SPA config
│   └── .env.example
│
├── server/                          # Express + MongoDB backend
│   ├── server.js                    # Main API + recommendation routing
│   ├── check.py                     # USA NER + NIH CSV matching
│   ├── india_check.py               # India JSON keyword matching
│   ├── india_supplements.json       # 60+ curated Indian supplement products
│   ├── models/
│   │   ├── User.js                  # User schema
│   │   └── Question.js              # Assessment schema (country, health goals)
│   ├── controllers/
│   │   ├── auth.js                  # Register/login
│   │   ├── question.js              # CRUD for assessments
│   │   └── user.js                  # Profile, password, admin stats
│   ├── routes/
│   └── .env.example
│
├── proxyserver.cjs                  # NIH PDF label proxy (port 3003)
├── render.yaml                      # Render.com deployment blueprint
└── README.md
```

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/questions/myQuestions/:userId` | Get user's assessments |
| POST | `/api/questions/createQuestion` | Create assessment |
| PUT | `/api/questions/updateQuestion/:id` | Save recommendations |
| DELETE | `/api/questions/deleteQuestion/:id` | Delete assessment |
| GET | `/api/users/getUser/:id` | Get user profile |
| PUT | `/api/users/updateProfile/:id` | Update profile |
| PUT | `/api/users/changePassword/:id` | Change password |
| GET | `/api/users/admin/stats` | Admin statistics |
| GET | `/run-python/:age/:desc` | USA supplement recommendations |
| GET | `/run-india/:age/:desc` | India supplement recommendations |

## 🛠️ Tech Stack

- **Frontend**: React 18, Redux Toolkit, Material UI, React Router v6
- **Backend**: Node.js, Express 4, Mongoose 8
- **Database**: MongoDB Atlas
- **AI**: Groq SDK (LLaMA 3.3-70B versatile) — fallback only
- **NLP**: Bio-Epidemiology-NER (Python), pandas
- **Data**: NIH DSLD (USA), Custom JSON (India)
