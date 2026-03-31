# Documentación de CyberVoid Hub (Español)

## Qué incluye este proyecto
- Panel seguro de archivos y gestión de carpetas.
- Vault con protección adicional por contraseña.
- Chat en tiempo real.
- Autenticación por credenciales y OAuth opcional.

## Recomendaciones para producción
- Usar MongoDB gestionado o una red privada segura.
- Mantener secrets en variables de entorno.
- Desactivar exposición de reset en debug (`EXPOSE_RESET_DEBUG=false`).
- Configurar CORS estricto y HTTPS.

## Guía de despliegue
1. Compilar frontend (`npm run build`).
2. Ejecutar backend con un gestor de procesos (systemd, supervisor, contenedor).
3. Configurar reverse proxy (Nginx/Caddy).
4. Activar certificados TLS.
5. Agregar backups y monitoreo.
