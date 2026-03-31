# ☁️ Self-host servidor (VPS/Cloud)

Ideal para: acceso multiusuario real.

## Arquitectura
- Nginx (TLS)
- FastAPI interno
- MongoDB central
- Frontend build estático

## Pasos
1. Configurar DNS.
2. Desplegar backend y frontend.
3. Configurar variables de entorno.
4. Activar HTTPS.
5. Restringir CORS a dominio real.
6. Monitoreo y backups.

## Variables críticas
- `EXPOSE_RESET_DEBUG=false`
- `CORS_ORIGINS=https://tu-dominio.com`
- `JWT_SECRET` largo y rotado.
