<div align="center">

# CyberVoid Hub

### Secure File Storage, Realtime Collaboration, and Offline Encrypted Workspace

<p>
  <a href="https://github.com/DarkJacke/Website-Pre-Alpha">Repository</a> •
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-offline-mode-new">Offline Mode</a> •
  <a href="#-documentation">Documentation</a>
</p>

</div>

---

## ✨ Overview
CyberVoid Hub is a full-stack platform for secure file management, sharing, vault workflows, and real-time chat.

This repository now includes a **dedicated Offline Mode** that launches with a single command, skips login, shows a welcome screen (`Bienvenido al modo offline`), and stores files in an **encrypted local folder**.

---

## 🚀 Features
- Secure file dashboard (upload, delete, move, share).
- Vault workflows with extra protection.
- Real-time collaboration through chat.
- Profile and theme customization.
- OAuth-ready authentication (Google/GitHub) for online mode.
- **Offline encrypted storage mode** for local testing and private workflows.

---

## 🧱 Tech Stack
### Frontend
- React 18
- React Router
- Tailwind CSS

### Backend
- FastAPI + Uvicorn
- MongoDB (Motor driver)
- JWT auth (`python-jose`)
- Password hashing (`passlib`, `bcrypt`)
- Encryption utilities (`cryptography`)

---

## ⚡ Quick Start
### Requirements
- Node.js 18+
- Python 3.11+
- MongoDB 7+
- Git

### Clone and install
```bash
git clone https://github.com/DarkJacke/Website-Pre-Alpha cybervoid-hub
cd cybervoid-hub

python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd frontend
npm install
cd ..
```

### Configure `.env`
Create `backend/.env`:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=filehub
JWT_SECRET=replace_with_a_long_unique_secret
UPLOAD_DIR=./uploads
APP_URL=http://localhost:3000

ADMIN_EMAIL=admin@cybervoid.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Change_This_Password_123!

CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EXPOSE_RESET_DEBUG=true
```

Create `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Run online mode
```bash
# terminal 1
mongod --dbpath ~/mongo-data

# terminal 2
cd backend
source ../.venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# terminal 3
cd frontend
npm start
```
Open: `http://localhost:3000`.

---

## 🔒 Offline Mode (New)
Offline Mode is completely separated from the standard login flow.

### What it does
- Starts local server on a dedicated port.
- No login required.
- Shows welcome message: **"Bienvenido al modo offline"**.
- Saves files in `offline/secure_vault/` encrypted at rest.

### Run offline mode
```bash
./scripts/run_offline_mode.sh
```
Default URL: `http://127.0.0.1:8787`

Custom port:
```bash
./scripts/run_offline_mode.sh 8899
```

Optional deterministic encryption key (advanced):
```bash
OFFLINE_SECRET="your-long-secret" ./scripts/run_offline_mode.sh
```

> The encrypted file index is stored in `offline/secure_vault/index.json`.

---

## 🗂️ Project Organization
```text
backend/               # Main FastAPI API and business logic
backend/offline_server.py
frontend/              # React application
offline/               # Offline UI and secure encrypted storage workspace
scripts/               # Utility scripts (offline launcher)
docs/                  # EN + ES docs
```

---

## 🛡️ Security Checklist
Before production use:
- [ ] Rotate `JWT_SECRET`.
- [ ] Set strong `ADMIN_PASSWORD`.
- [ ] Disable reset debug exposure: `EXPOSE_RESET_DEBUG=false`.
- [ ] Restrict `CORS_ORIGINS` to trusted domains.
- [ ] Protect MongoDB with network rules + authentication.

---

## 📚 Documentation
- English: [`docs/README.en.md`](docs/README.en.md)
- Español: [`docs/README.es.md`](docs/README.es.md)

---

## 🧪 Useful Commands
```bash
python -m py_compile backend/server.py
python -m py_compile backend/offline_server.py
python -m pytest backend/tests/test_all_features.py
cd frontend && npm run build
```

## License
MIT
