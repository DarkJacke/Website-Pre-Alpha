# 🧬 Arquitectura: base local + base central

## Objetivo
Permitir modo local y modo colaborativo centralizado.

## Diseño sugerido
1. **Backend central FastAPI** (internet).
2. **MongoDB central** para cuentas, archivos, chats.
3. **Clientes locales** (web o app Windows) consumen la misma API.
4. OAuth Google habilitado solo en backend central.

## Modo híbrido (futuro)
- Caché local para archivos recientes.
- Sincronización eventual con backend central.
- Cola offline para cambios pendientes.

## Ventajas
- Usuarios comparten la misma plataforma.
- Administración centralizada.
- Menor fragmentación de datos.
