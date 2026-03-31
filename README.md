<div align="center">

# CyberVoid Hub

**Secure file storage and real-time collaboration platform**  
React + FastAPI + MongoDB

[Overview](#overview) •
[Features](#features) •
[Tech Stack](#tech-stack) •
[Quick Start](#quick-start) •
[Configuration](#configuration) •
[Security](#security-checklist) •
[Documentation](#documentation)

</div>

---

## Overview
CyberVoid Hub is a full-stack application for secure file management, private vault access, sharing links, and team chat in real time. It is designed for local development and self-hosted deployment with a straightforward setup process.

## Features
- File dashboard with upload, folder management, moving, sharing, and deletion.
- Private vault protected with an additional password layer.
- Real-time chat using WebSockets.
- Authentication with email/password and optional OAuth (Google/GitHub).
- User profile and theme personalization.
- Admin bootstrap support from environment variables.

## Tech Stack
### Frontend
- React 18
- React Router
- Tailwind CSS (configured)

### Backend
- FastAPI
- Motor (MongoDB async driver)
- JWT authentication with `python-jose`
- Password hashing with `passlib + bcrypt`

### Data
- MongoDB 7+

## Quick Start
### Requirements
- Node.js 18+
- Python 3.11+
- MongoDB 7+
- Git

### 1) Clone and install dependencies
```bash
git clone <YOUR_REPO_URL> cybervoid-hub
cd cybervoid-hub

python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd frontend
npm install
cd ..
```

### 2) Configure environment files
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

# Optional OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Create `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 3) Run locally
Terminal 1 (MongoDB):
```bash
mongod --dbpath ~/mongo-data
```

Terminal 2 (Backend):
```bash
cd backend
source ../.venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Terminal 3 (Frontend):
```bash
cd frontend
npm start
```

Open: `http://localhost:3000`.

## Self-Hosting Notes
### Linux (systemd user service)
`~/.config/systemd/user/cybervoid-backend.service`
```ini
[Unit]
Description=CyberVoid Backend
After=network.target

[Service]
WorkingDirectory=%h/cybervoid-hub/backend
ExecStart=%h/cybervoid-hub/.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
EnvironmentFile=%h/cybervoid-hub/backend/.env

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now cybervoid-backend
```

### VPS/Cloud baseline
- Nginx as reverse proxy on 80/443.
- Frontend served as static build.
- Backend on `127.0.0.1:8001`.
- Managed MongoDB (or secured local MongoDB).

## Security Checklist
Before public exposure:
- [ ] Rotate `JWT_SECRET`.
- [ ] Set a strong `ADMIN_PASSWORD`.
- [ ] Set `EXPOSE_RESET_DEBUG=false` in production.
- [ ] Restrict `CORS_ORIGINS` to your real domain(s).
- [ ] Ensure MongoDB is not publicly exposed without firewall and auth.

## Project Organization
```text
backend/      # FastAPI app, models, auth, API endpoints
frontend/     # React app and UI components
docs/         # Documentation in multiple languages
test_reports/ # Historical test artifacts
memory/       # Product/project notes
```

## Documentation
- English docs: [`docs/README.en.md`](docs/README.en.md)
- Documentación en español: [`docs/README.es.md`](docs/README.es.md)

## Useful Commands
```bash
# Backend syntax check
python -m py_compile backend/server.py

# Backend tests
python -m pytest backend/tests/test_all_features.py

# Frontend production build
cd frontend && npm run build
```

## License
MIT
