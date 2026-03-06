<div align="center">

# CyberVoid Hub

**Secure File Storage Platform**

A cyberpunk-themed file storage hub with real-time messaging, encrypted vault, shareable links, social login, and full theme customization.

Built with **React** + **FastAPI** + **MongoDB**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-FF2A6D)](LICENSE)

</div>

---

## Features

### File Management
- Upload any file type up to 100MB
- Online preview for images and videos (full-screen modal)
- Grid/List view with type filters (image, video, document, other)
- **File folders** - organize files into named folders
- **Move files** between folders
- **Bulk select & delete** - manage multiple files at once

### Share Links
- Generate temporary download links (1h to 30 days expiry)
- Share with anyone - no account required
- Download counter tracks link usage
- Preview and download via shared link
- One-click copy to clipboard

### Secure Vault
- Separate password-protected storage area
- 30-minute sessions - auto-locks after inactivity
- Upload directly to vault (files never appear in public dashboard)
- Bcrypt-hashed vault password
- Visual lock/unlock interface

### User System
- **Register & Login** with JWT authentication
- **Google OAuth** social login (via Emergent Auth)
- **GitHub OAuth** social login (requires GitHub App credentials)
- **Forgot Password** - email-based reset flow (code-based)
- Custom avatar upload (max 5MB)
- Display name, bio, and username customization
- Public user profiles with file showcase

### Real-Time Chat
- WebSocket-powered instant messaging
- **Typing indicators** - see when others are typing
- **Read receipts** - double-check marks for read messages
- Start conversations from search or user profiles
- Message history persisted in MongoDB

### Search
- Dual search: files and user accounts
- Category toggle: All, Files, Accounts
- Quick actions: view profile, start chat, download

### Notifications & Storage
- **Notification settings** - toggle push, chat, and file notifications
- **Storage quota** - visual progress bar showing usage (1GB default)
- Per-file size tracking and aggregate stats

### File Comments
- Add comments to any file
- View comment threads with timestamps
- Delete your own comments

### Theme Customization
- 8 accent colors: Neon Red, Pink, Electric Blue, Acid Green, Cyber Yellow, Void Purple, Sunset Orange, Ice White
- Wallpaper system: 3 presets + custom URL
- AMOLED Black base (#000000)
- Settings saved to user account

### Security
- Bcrypt hashing (12 rounds) for passwords
- JWT tokens with 30-day expiration
- Rate limiting (5 login attempts/email, 10/IP per 5 min)
- Input validation and search sanitization
- File name sanitization
- WebSocket authentication

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Tailwind CSS |
| Backend | Python FastAPI |
| Database | MongoDB (Motor async driver) |
| Auth | JWT + bcrypt + OAuth 2.0 |
| Real-time | WebSockets |
| Fonts | Orbitron, JetBrains Mono, Rajdhani |
| Icons | Lucide React |

---

## Project Structure

```
cybervoid-hub/
├── backend/
│   ├── server.py              # All API routes, WebSocket, auth
│   ├── .env                   # Environment variables
│   ├── requirements.txt       # Python dependencies
│   └── uploads/               # Stored files
│
├── frontend/
│   ├── src/
│   │   ├── api.js             # API client (all endpoints)
│   │   ├── App.js             # Layout + page routing
│   │   ├── index.css          # Global styles + animations
│   │   ├── contexts/
│   │   │   ├── AuthContext.js  # JWT + OAuth auth state
│   │   │   └── ThemeContext.js # Theme management
│   │   └── components/
│   │       ├── AuthPage.js    # Login/Register/Forgot/OAuth
│   │       ├── Dashboard.js   # File grid + folders + bulk ops
│   │       ├── UploadPage.js  # File upload
│   │       ├── ChatPage.js    # Messaging + typing/receipts
│   │       ├── SettingsPage.js# Profile, security, themes, storage
│   │       ├── ProfilePage.js # Public user profiles
│   │       ├── VaultPage.js   # Secure vault
│   │       ├── ShareModal.js  # Share link creation
│   │       ├── SearchResults.js# Search
│   │       ├── FilePreview.js # Image/video viewer
│   │       └── Sidebar.js     # Navigation
│   └── .env                   # REACT_APP_BACKEND_URL
│
└── README.md
```

---

## API Reference

### Authentication
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | - | Create account |
| POST | `/api/auth/login` | - | Login with email/password |
| GET | `/api/auth/me` | JWT | Current user info |
| PUT | `/api/auth/change-password` | JWT | Change password |
| POST | `/api/auth/forgot-password` | - | Request password reset code |
| POST | `/api/auth/reset-password` | - | Reset password with token |
| POST | `/api/auth/google` | - | Google OAuth callback |
| GET | `/api/auth/github/url` | - | Get GitHub OAuth URL |
| POST | `/api/auth/github` | - | GitHub OAuth callback |

### Users
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/users/{user_id}` | - | Public profile |
| PUT | `/api/users/profile` | JWT | Update display name, bio |
| PUT | `/api/users/theme` | JWT | Update theme settings |
| POST | `/api/users/avatar` | JWT | Upload avatar (max 5MB) |

### Files
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/files/upload` | JWT | Upload file (multipart) |
| GET | `/api/files` | JWT | List my files |
| GET | `/api/files/public/{user_id}` | - | User's public files |
| GET | `/api/files/preview/{file_id}` | - | Preview/stream file |
| GET | `/api/files/download/{file_id}` | - | Download file |
| DELETE | `/api/files/{file_id}` | JWT | Delete file |
| PUT | `/api/files/{file_id}/move` | JWT | Move to folder |
| POST | `/api/files/bulk-delete` | JWT | Bulk delete files |

### Folders
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/folders` | JWT | Create folder |
| GET | `/api/folders` | JWT | List my folders |
| DELETE | `/api/folders/{folder_id}` | JWT | Delete folder |

### Comments
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/files/{file_id}/comments` | JWT | Add comment |
| GET | `/api/files/{file_id}/comments` | - | List comments |
| DELETE | `/api/comments/{comment_id}` | JWT | Delete comment |

### Share Links
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/share` | JWT | Create share link |
| GET | `/api/share/{link_id}` | - | Get share info |
| GET | `/api/share/{link_id}/download` | - | Download via link |
| GET | `/api/share/{link_id}/preview` | - | Preview via link |
| GET | `/api/my-shares` | JWT | My share links |
| DELETE | `/api/share/{link_id}` | JWT | Delete link |

### Vault
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/vault/setup` | JWT | Create vault password |
| POST | `/api/vault/unlock` | JWT | Unlock (30min token) |
| GET | `/api/vault/status` | JWT | Check vault status |
| POST | `/api/vault/upload` | JWT+Vault | Upload to vault |
| GET | `/api/vault/files` | JWT+Vault | List vault files |
| DELETE | `/api/vault/files/{id}` | JWT+Vault | Delete vault file |

### Chat
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/chats` | JWT | My conversations |
| POST | `/api/chats` | JWT | Create conversation |
| GET | `/api/chats/{id}/messages` | JWT | Get messages |
| POST | `/api/chats/{id}/messages` | JWT | Send message |
| POST | `/api/chats/{id}/read` | JWT | Mark as read |
| WS | `/api/ws/chat/{id}` | JWT | Real-time WebSocket |

### Storage & Notifications
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/storage` | JWT | Storage usage stats |
| GET | `/api/notifications/settings` | JWT | Get notification prefs |
| PUT | `/api/notifications/settings` | JWT | Update notification prefs |

### Other
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/search?q=&type=` | Search files/users |

---

## Deployment

### Option 1: Docker Compose (Recommended)

```bash
git clone https://github.com/your-user/cybervoid-hub.git
cd cybervoid-hub
```

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8001:8001"
    env_file: ./backend/.env
    volumes:
      - uploads:/app/uploads
    depends_on:
      - mongo

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  uploads:
  mongo_data:
```

Create `Dockerfile.backend`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
RUN mkdir -p uploads
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```bash
docker-compose up -d
```

### Option 2: Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login & init
railway login
railway init

# 3. Add MongoDB plugin
railway add --plugin mongodb

# 4. Set environment variables in Railway dashboard:
#    MONGO_URL = (auto from MongoDB plugin)
#    DB_NAME = filehub
#    JWT_SECRET = your-secure-random-string
#    UPLOAD_DIR = /app/uploads
#    APP_URL = https://your-app.railway.app

# 5. Deploy
railway up
```

### Option 3: Render

1. Create a [Render](https://render.com) account
2. **Backend**: New > Web Service > Connect GitHub repo
   - Build: `pip install -r backend/requirements.txt`
   - Start: `uvicorn backend.server:app --host 0.0.0.0 --port $PORT`
   - Add environment variables
3. **Frontend**: New > Static Site
   - Build: `cd frontend && yarn install && yarn build`
   - Publish: `frontend/build`
4. **Database**: New > MongoDB or use [MongoDB Atlas](https://www.mongodb.com/atlas) free tier

### Option 4: VPS (DigitalOcean, Linode, Hetzner)

```bash
# SSH into server
ssh root@your-server-ip

# Install dependencies
apt update && apt install -y python3-pip nodejs npm nginx certbot

# Install MongoDB
# See: https://www.mongodb.com/docs/manual/installation/

# Clone & setup backend
git clone https://github.com/your-user/cybervoid-hub.git
cd cybervoid-hub/backend
pip3 install -r requirements.txt
# Create .env with production values

# Build frontend
cd ../frontend
npm install && npm run build

# Setup Nginx reverse proxy (config below)
# Setup systemd service (config below)
# Setup SSL
certbot --nginx -d yourdomain.com
```

<details>
<summary>Nginx config</summary>

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /path/to/cybervoid-hub/frontend/build;
        try_files $uri $uri/ /index.html;
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

</details>

<details>
<summary>Systemd service</summary>

```ini
# /etc/systemd/system/cybervoid.service
[Unit]
Description=CyberVoid Hub Backend
After=network.target mongodb.service

[Service]
User=www-data
WorkingDirectory=/path/to/cybervoid-hub/backend
ExecStart=/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
EnvironmentFile=/path/to/cybervoid-hub/backend/.env

[Install]
WantedBy=multi-user.target
```

</details>

### Option 5: GitHub Codespaces

1. Fork this repository
2. Click **Code** > **Codespaces** > **Create codespace on main**
3. In the terminal:

```bash
# Install backend dependencies
cd backend
pip install -r requirements.txt

# Start MongoDB (if not running)
mongod --fork --logpath /tmp/mongo.log

# Create .env
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=filehub
JWT_SECRET=dev-secret-change-in-production
UPLOAD_DIR=./uploads
EOF

# Start backend
uvicorn server:app --host 0.0.0.0 --port 8001 &

# Install and start frontend
cd ../frontend
yarn install

# Update .env to point to the codespace URL
echo "REACT_APP_BACKEND_URL=https://$CODESPACE_NAME-8001.app.github.dev" > .env

yarn start
```

4. Open the **Ports** tab and make ports 3000 and 8001 public

---

## Environment Variables

### Backend (`backend/.env`)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=filehub
JWT_SECRET=change-this-to-a-random-64-char-string
UPLOAD_DIR=/path/to/uploads
APP_URL=https://yourdomain.com

# Optional: GitHub OAuth (register at https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Frontend (`frontend/.env`)

```env
REACT_APP_BACKEND_URL=https://yourdomain.com
```

---

## GitHub OAuth Setup

To enable "Login with GitHub":

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: CyberVoid Hub
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://yourdomain.com`
4. Copy the **Client ID** and generate a **Client Secret**
5. Add to `backend/.env`:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```
6. Restart the backend

---

## Local Storage Options

### Mount External Drive

```bash
# Mount SSD/HDD
sudo mkdir -p /mnt/storage
sudo mount /dev/sdb1 /mnt/storage

# Create uploads dir
sudo mkdir -p /mnt/storage/cybervoid-files
sudo chown -R $USER:$USER /mnt/storage/cybervoid-files

# Update backend .env
UPLOAD_DIR=/mnt/storage/cybervoid-files
```

### Encrypted Storage (LUKS)

<details>
<summary>Full encrypted storage setup</summary>

```bash
# Create 10GB encrypted container
dd if=/dev/zero of=/mnt/storage/vault.img bs=1M count=10240
sudo cryptsetup luksFormat /mnt/storage/vault.img
sudo cryptsetup luksOpen /mnt/storage/vault.img cybervoid-encrypted
sudo mkfs.ext4 /dev/mapper/cybervoid-encrypted
sudo mkdir -p /mnt/cybervoid-secure
sudo mount /dev/mapper/cybervoid-encrypted /mnt/cybervoid-secure
sudo chown -R $USER:$USER /mnt/cybervoid-secure

# Update .env: UPLOAD_DIR=/mnt/cybervoid-secure

# Lock: sudo umount /mnt/cybervoid-secure && sudo cryptsetup luksClose cybervoid-encrypted
# Unlock: sudo cryptsetup luksOpen /mnt/storage/vault.img cybervoid-encrypted && sudo mount ...
```

</details>

---

## Customization

| What | Where | How |
|------|-------|-----|
| Default accent color | `frontend/src/index.css` | Change `--accent-color` and `--accent-rgb` |
| Add accent presets | `frontend/src/contexts/ThemeContext.js` | Add to `ACCENT_PRESETS` array |
| Add wallpapers | Same file | Add to `WALLPAPERS` array |
| Change fonts | `frontend/public/index.html` + `tailwind.config.js` | Update `<link>` and `fontFamily` |
| File size limit | `backend/server.py` | Change `MAX_FILE_SIZE` |
| Storage quota | `backend/server.py` | Change `storage_quota` in user creation |
| Avatar style | `backend/server.py` | Change DiceBear URL style (bottts, pixel-art, etc.) |

---

## Future Roadmap

- [ ] File versioning
- [ ] Two-factor authentication (2FA)
- [ ] Admin panel with user management
- [ ] File encryption at rest (per-file)
- [ ] CDN integration for faster delivery
- [ ] Mobile native app (React Native)
- [ ] Email notification service integration
- [ ] File drag-and-drop between folders

---

## License

MIT

