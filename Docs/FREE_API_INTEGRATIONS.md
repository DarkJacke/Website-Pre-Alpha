# 🌐 Integraciones API gratuitas recomendadas

## 1) Cloudinary (free)
Uso: optimizar previews de imágenes/video.

## 2) Resend / EmailJS (free tier)
Uso: email real para recuperación de cuenta.

## 3) OpenStreetMap + Nominatim
Uso: geolocalización sin Google Maps de pago.

## 4) LibreTranslate
Uso: traducción de interfaz/comentarios.

## 5) Gravatar / Dicebear
Uso: avatares por defecto dinámicos.

## Patrón recomendado
- Crear adaptadores en backend (`services/`)
- Manejar timeouts/retries
- Guardar secrets en `.env`
- Limitar rate por usuario/IP
