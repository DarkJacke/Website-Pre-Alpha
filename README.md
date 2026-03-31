<div align="center">

# 🦊⚡ CyberVoid Hub

### _Secure File Storage con estilo cyber-anime_

<p>
  <img src="https://img.shields.io/badge/Frontend-React_18-7F5AF0?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-E53170?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-MongoDB-2CB67D?style=for-the-badge&logo=mongodb&logoColor=white" />
</p>

<p>
  <a href="#-inicio-rápido"><img src="https://img.shields.io/badge/🚀%20Inicio%20Rápido-FFFFFF?style=for-the-badge&logoColor=black" /></a>
  <a href="./Docs/INDEX.md"><img src="https://img.shields.io/badge/📚%20Guías%20Detalladas-AE67FA?style=for-the-badge&logoColor=white" /></a>
  <a href="#-modo-app-en-windows-estilo-exe"><img src="https://img.shields.io/badge/🪟%20Windows%20App%20(EXE)-FF5470?style=for-the-badge&logoColor=white" /></a>
</p>

</div>

---

## 🌌 Visión

CyberVoid Hub es una plataforma para:

- Guardar archivos de forma segura.
- Compartir archivos por enlace.
- Gestionar perfiles y autenticación.
- Trabajar localmente (Windows/Linux) o desplegar en servidor.

Paleta visual recomendada del proyecto (blanco/rojo/morado):

- **Blanco:** `#FFFFFE`
- **Rojo principal:** `#E53170`
- **Morado acento:** `#7F5AF0`

---

## ✨ Inicio rápido

> Si quieres el tutorial ultra detallado, ve a **[Docs/INDEX.md](./Docs/INDEX.md)**.

### Linux (rápido)

```bash
git clone <TU_REPO_URL> cybervoid-hub
cd cybervoid-hub

python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd frontend && npm install && cd ..
```

### Windows (rápido, PowerShell)

```powershell
git clone <TU_REPO_URL> cybervoid-hub
cd cybervoid-hub

py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt

cd frontend
npm install
cd ..
```

---

## 🔐 Configuración base (.env)

### `backend/.env`

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=filehub
JWT_SECRET=usa_un_secreto_muy_largo
UPLOAD_DIR=./uploads

ADMIN_EMAIL=admin@cybervoid.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Cambia_Esta_Clave_123!

CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EXPOSE_RESET_DEBUG=true

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### `frontend/.env`

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 🧭 Ejecución local por pasos

### 1) Levantar MongoDB
- Linux: `mongod --dbpath ~/mongo-data`
- Windows: `mongod --dbpath C:\mongo-data`

### 2) Levantar backend

```bash
cd backend
# Linux
source ../.venv/bin/activate
# Windows: ..\.venv\Scripts\Activate.ps1
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 3) Levantar frontend

```bash
cd frontend
npm start
```

Abrir: `http://localhost:3000`

---

## 👑 Admin con permisos especiales

Cuando el backend arranca, si el admin no existe:

- Usa `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
- Si no hay `ADMIN_PASSWORD`, se genera una temporal y se imprime en logs.

👉 Recomendación fuerte: en producción usa contraseña larga + rotación tras primer login.

---

## 🧪 Verificar funcionalidad (rápido)

- Compilar sintaxis backend: `python -m py_compile backend/server.py`
- Revisar endpoint de salud: `GET /api/health`
- Confirmar login/admin desde UI.
- Probar subida/descarga de archivo.

Checklist completa en: **[Docs/QA_CHECKLIST.md](./Docs/QA_CHECKLIST.md)**

---

## 🖥️ Modo app en Windows (estilo .exe)

Sí se puede. Recomendado usar **Electron + React build** para una experiencia tipo aplicación de escritorio.

Guía completa: **[Docs/WINDOWS_EXE_APP.md](./Docs/WINDOWS_EXE_APP.md)**

---

## 🏠 Self-hosting

- **Personal/local persistente:** [Docs/SELF_HOST_PERSONAL.md](./Docs/SELF_HOST_PERSONAL.md)
- **Servidor/VPS producción:** [Docs/SELF_HOST_SERVER.md](./Docs/SELF_HOST_SERVER.md)

---

## 🌐 APIs gratuitas recomendadas (sin pago)

Ideas para ampliar funcionalidad sin costo:

- Cloudinary Free (transformación y CDN de media)
- EmailJS/Resend free tier (notificaciones)
- OpenStreetMap + Nominatim (mapas/geocoding)
- LibreTranslate (traducción)

Documento de integración: **[Docs/FREE_API_INTEGRATIONS.md](./Docs/FREE_API_INTEGRATIONS.md)**

---

## 🧬 Base de datos local + central compartida

Si quieres que todos usen un backend central con login Google y sincronización real:

- Mantén backend FastAPI único (cloud/VPS).
- MongoDB central (Atlas o servidor dedicado).
- Clientes locales (web o app Windows) apuntan al mismo backend.

Diseño detallado: **[Docs/CENTRAL_DATABASE_ARCHITECTURE.md](./Docs/CENTRAL_DATABASE_ARCHITECTURE.md)**

---

## 🖼️ Cómo previsualizar la UI antes de desplegar todo

Guía: **[Docs/PREVIEW_GUIDE.md](./Docs/PREVIEW_GUIDE.md)**

Incluye:
- Preview solo frontend con mocks.
- Preview conectado al backend local.
- Capturas para documentación interna.

---

## 📚 Índice de documentación extendida

👉 **[Docs/INDEX.md](./Docs/INDEX.md)**

---

## License
MIT
