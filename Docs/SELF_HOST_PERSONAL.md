# 🏠 Self-host personal (uso privado)

Ideal para: PC personal, mini PC, NAS.

## Recomendación
- Backend en `127.0.0.1:8001`
- Frontend estático
- MongoDB local
- Firewall activo

## Linux con systemd user
1. Crea servicio user para backend.
2. Habilita autostart.
3. Sirve frontend con `serve` o Nginx local.

## Seguridad mínima
- `JWT_SECRET` fuerte
- `EXPOSE_RESET_DEBUG=true` solo si es uso local
- Backup semanal de MongoDB
