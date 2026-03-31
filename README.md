<div align="center">

# CyberVoid Hub

**Secure File Storage Platform (React + FastAPI + MongoDB)**

</div>

---

## ⚡ Qué incluye este proyecto

- Dashboard de archivos con carpetas, mover, borrar y compartir.
- Vault protegido por contraseña adicional.
- Chat en tiempo real por WebSocket.
- Login por email/password y OAuth (Google/GitHub).
- Temas visuales y personalización de perfil.

---

## ✅ Requisitos mínimos (Windows y Linux)

> Este README se centra en **host local y self-hosting personal/servidor**.

- **Node.js 18+**
- **Python 3.11+**
- **MongoDB 7+** (local o remoto)
- **Git**

---

## 1) Quick Start Local (Linux)

### 1.1 Clonar e instalar

```bash
git clone <TU_REPO_URL> cybervoid-hub
cd cybervoid-hub

python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd frontend
npm install
cd ..
```

### 1.2 Configurar backend `.env`

Crear `backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=filehub
JWT_SECRET=pon_aqui_un_secreto_largo_y_unico
UPLOAD_DIR=./uploads

# Admin bootstrap
ADMIN_EMAIL=admin@cybervoid.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Cambia_Esta_Clave_123!

# CORS local (separado por coma)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Solo desarrollo: devuelve token/código de reset en respuesta
EXPOSE_RESET_DEBUG=true
```

### 1.3 Configurar frontend `.env`

Crear `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 1.4 Ejecutar en local

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

Abrir: `http://localhost:3000`.

---

## 2) Quick Start Local (Windows)

### 2.1 Clonar e instalar

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

### 2.2 Configurar `.env`

Usa los mismos bloques del apartado Linux para:

- `backend/.env`
- `frontend/.env`

### 2.3 Ejecutar en local

Terminal 1 (MongoDB):

```powershell
mongod --dbpath C:\mongo-data
```

Terminal 2 (Backend):

```powershell
cd backend
..\.venv\Scripts\Activate.ps1
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Terminal 3 (Frontend):

```powershell
cd frontend
npm start
```

Abrir: `http://localhost:3000`.

---

## 3) Cuenta de administrador (permisos especiales)

Al iniciar backend, si el admin no existe, se crea con:

- `ADMIN_EMAIL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Recomendación:

- En desarrollo local define una clave fácil de recordar.
- En producción usa una clave larga/aleatoria y rota la contraseña tras primer acceso.

Si no defines `ADMIN_PASSWORD`, se genera una temporal y se imprime en logs del backend.

---

## 4) Self-hosting personal (modo local persistente)

Ideal para uso personal en tu PC o mini-servidor casero.

### 4.1 Backend en segundo plano (Linux con systemd user)

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

### 4.2 Frontend estático personal

```bash
cd frontend
npm run build
npx serve -s build -l 3000
```

---

## 5) Self-hosting para servidor (VPS / cloud)

### 5.1 Arquitectura recomendada

- Nginx (443/80)
- Frontend build estático
- FastAPI en `127.0.0.1:8001`
- MongoDB gestionado (Atlas) o local protegido

### 5.2 Nginx básico

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    root /var/www/cybervoid/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 100M;
    }
}
```

### 5.3 Recomendaciones servidor

- `EXPOSE_RESET_DEBUG=false`
- `CORS_ORIGINS=https://tu-dominio.com`
- `JWT_SECRET` de 64+ caracteres
- TLS obligatorio (Let's Encrypt)
- Backups diarios de MongoDB

---

## 6) Checklist de seguridad (rápido)

Antes de abrir al público:

- [ ] Cambiar `JWT_SECRET`.
- [ ] Definir `ADMIN_PASSWORD` robusto.
- [ ] Poner `EXPOSE_RESET_DEBUG=false`.
- [ ] Limitar `CORS_ORIGINS` al dominio real.
- [ ] Verificar que MongoDB no expone puerto público sin firewall.

---

## 7) Vulnerabilidades y limpieza detectadas en esta iteración

Se corrigieron puntos de riesgo en backend:

1. Se eliminaron credenciales admin hardcodeadas por defecto.
2. CORS dejó de permitir `*` global y ahora usa lista configurable.
3. Se agregó validación de variables críticas (`MONGO_URL`, `DB_NAME`, `JWT_SECRET`).
4. El flujo de reset se dejó controlado por `EXPOSE_RESET_DEBUG` para evitar exposición accidental en producción.

---

## 8) Comandos útiles

### Backend tests rápidos

```bash
python -m py_compile backend/server.py
```

### Revisar estado del admin creado

```bash
# Log del backend (si usas systemd user)
systemctl --user status cybervoid-backend
```

---

## 9) Variables de entorno

### Backend (`backend/.env`)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=filehub
JWT_SECRET=secreto_largo
UPLOAD_DIR=./uploads
APP_URL=http://localhost:3000

ADMIN_EMAIL=admin@cybervoid.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Cambia_Esta_Clave_123!

CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EXPOSE_RESET_DEBUG=true

# OAuth opcional
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Frontend (`frontend/.env`)

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## License

MIT
