# 🪟 Tutorial ultra detallado: Local en Windows

## 1. Instalar herramientas
- Node.js 18+
- Python 3.11+
- MongoDB Community Server
- Git

## 2. Clonar
```powershell
git clone <TU_REPO_URL> cybervoid-hub
cd cybervoid-hub
```

## 3. Entorno Python
```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

## 4. Frontend
```powershell
cd frontend
npm install
cd ..
```

## 5. Configurar `.env`
- Crear `backend/.env`
- Crear `frontend/.env`

## 6. Ejecutar MongoDB
```powershell
mongod --dbpath C:\mongo-data
```

## 7. Ejecutar backend
```powershell
cd backend
..\.venv\Scripts\Activate.ps1
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## 8. Ejecutar frontend
```powershell
cd frontend
npm start
```

## 9. Resultado
Abre `http://localhost:3000`.
