# 🐧 Tutorial ultra detallado: Local en Linux

## 1. Instalar dependencias
- Node 18+
- Python 3.11+
- MongoDB 7+
- Git

## 2. Clonar
```bash
git clone <TU_REPO_URL> cybervoid-hub
cd cybervoid-hub
```

## 3. Entorno Python
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

## 4. Dependencias frontend
```bash
cd frontend
npm install
cd ..
```

## 5. Variables de entorno backend
Crea `backend/.env` con valores reales (ver README).

## 6. Variables frontend
Crea `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 7. MongoDB
```bash
mkdir -p ~/mongo-data
mongod --dbpath ~/mongo-data
```

## 8. Backend
```bash
cd backend
source ../.venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## 9. Frontend
```bash
cd frontend
npm start
```

## 10. Validación final
- UI en `http://localhost:3000`
- API health en `http://localhost:8001/api/health`
- Login admin según `.env`
