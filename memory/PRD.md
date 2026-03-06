# CyberVoid Hub - PRD

## Problem Statement
Hub de guardado de archivos con frontend y backend completamente conectados. Tema AMOLED negro con sistema de temas customizable. Funciones: upload, download, vista online de archivos, sistema de mensajes en tiempo real, perfiles de usuario con ID, búsqueda de archivos y cuentas, y seguridad robusta en login/register.

## Architecture
- **Frontend**: React 18 + Tailwind CSS (port 3000)
- **Backend**: FastAPI + Python (port 8001)
- **Database**: MongoDB (motor async)
- **Auth**: JWT + bcrypt (12 rounds)
- **Real-time**: WebSockets nativos de FastAPI
- **File Storage**: Filesystem local (/app/backend/uploads)

## User Personas
1. **Usuario General** - Sube, descarga, y organiza archivos personales
2. **Usuario Social** - Comparte archivos públicos, chatea con otros usuarios
3. **Usuario Personalización** - Configura temas, colores, wallpapers

## Core Requirements (Static)
- [x] Autenticación JWT (registro/login)
- [x] Subida de archivos (cualquier tipo, max 100MB)
- [x] Descarga de archivos
- [x] Vista previa online (imágenes y videos)
- [x] Perfiles públicos por ID
- [x] Chat en tiempo real (WebSocket)
- [x] Búsqueda de archivos y cuentas
- [x] Sistema de temas (8 colores de acento + wallpapers)
- [x] Sidebar navegación con search
- [x] Menú desplegable de usuario (profile, settings, logout)
- [x] Responsividad mobile/desktop
- [x] Seguridad: rate limiting, validación inputs, password strength

## What's Been Implemented (Jan 2026)
### Backend
- Auth: register, login, me, change-password with validation
- Files: upload, download, preview, delete, public files by user
- Users: profile view, update profile, update theme
- Search: files + accounts with regex sanitization
- Chat: create/get chats, send messages, WebSocket real-time
- Rate limiting: 5 login/email, 10 login/IP, 5 register/IP per 5 min
- Input validation: email, username, password strength, file names

### Frontend
- AuthPage: login/register tabs, password strength indicator, confirm password, validation
- Dashboard: file grid/list, type filters, stats
- Upload: drag & drop, public/private toggle
- Settings: profile edit, security (change password), accent colors (8), wallpapers (4 presets + custom URL)
- Chat: real-time messaging, chat list, WebSocket integration
- Profile: public view, file gallery, message button
- Search: files + accounts categories, results with actions
- Sidebar: collapsible, search, navigation, user dropdown
- Mobile: responsive layout, hamburger menu, touch-friendly
- Page transitions: smooth animated transitions between pages

## Prioritized Backlog
### P0 (Done)
- All core features implemented and tested

### P1 (Next)
- File sharing links with expiration
- Typing indicators in chat
- Read receipts for messages
- Folder/category organization

### P2 (Future)
- 2FA authentication
- File versioning
- Admin panel
- OAuth integration (Google/GitHub)
- Storage quotas
- File encryption at rest
- Email notifications
- Bulk file operations

## Next Tasks
1. Add file sharing links (public URL with optional expiration)
2. Implement typing indicators in chat
3. Add folder organization for files
4. Consider adding notifications system
