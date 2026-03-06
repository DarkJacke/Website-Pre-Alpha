# CyberVoid Hub - PRD

## Problem Statement
Hub de guardado de archivos con frontend y backend completamente conectados. Tema AMOLED negro con sistema de temas customizable. Funciones: upload, download, vista online, sistema de mensajes, perfiles de usuario con ID, búsqueda, seguridad robusta, share links con expiración, carpeta segura (vault) con contraseña, customización de avatar y apodo.

## Architecture
- **Frontend**: React 18 + Tailwind CSS (port 3000)
- **Backend**: FastAPI + Python (port 8001)
- **Database**: MongoDB (motor async)
- **Auth**: JWT + bcrypt (12 rounds)
- **Real-time**: WebSockets nativos de FastAPI
- **File Storage**: Filesystem local (/app/backend/uploads)

## User Personas
1. **Usuario General** - Sube, descarga, organiza y comparte archivos
2. **Usuario Social** - Comparte archivos públicos, chatea, tiene perfil personalizado
3. **Usuario Seguro** - Usa vault encriptado, links temporales, contraseña fuerte

## Core Requirements
- [x] Autenticación JWT (registro/login con validación)
- [x] Subida de archivos (cualquier tipo, max 100MB)
- [x] Descarga de archivos
- [x] Vista previa online (imágenes y videos)
- [x] Perfiles públicos por ID
- [x] Chat en tiempo real (WebSocket)
- [x] Búsqueda de archivos y cuentas
- [x] Sistema de temas (8 colores + wallpapers)
- [x] Sidebar navegación
- [x] Menú desplegable de usuario
- [x] Responsividad mobile/desktop
- [x] Seguridad: rate limiting, validación, password strength
- [x] **Share links** con expiración configurable
- [x] **Secure Vault** con contraseña independiente
- [x] **Avatar personalizado** (upload foto)
- [x] **Display name** (apodo) customizable
- [x] **README** con tutoriales de deploy, local storage, encriptación

## What's Been Implemented (Jan 2026)
### Iteration 1 - MVP
- Auth completa, file management, chat, search, themes, mobile responsive

### Iteration 2 - Features adicionales
- Share links con expiración (1h, 6h, 24h, 7d, 30d) + download counter
- Secure Vault (carpeta protegida con contraseña separada, sesión 30min)
- Avatar upload personalizado (max 5MB, reemplaza el generado)
- Display name editable en Settings
- Bio personalizable
- Copy User ID button
- README completo con:
  - Tutorial deploy Railway, Render, VPS, Docker
  - Tutorial almacenamiento local SSD/HDD
  - Tutorial encriptación LUKS para carpeta de archivos
  - Guía de customización completa

## Prioritized Backlog
### P1 (Next)
- Typing indicators en chat
- Read receipts para mensajes
- Organización por carpetas
- Notificaciones de nuevos mensajes

### P2 (Future)
- 2FA authentication
- File versioning
- Admin panel
- OAuth (Google/GitHub)
- Storage quotas
- CDN integration
- Mobile native app
