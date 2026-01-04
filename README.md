
# Gestión de Ingresos y Egresos — Admin de Cuentas + Landing

Incluye todo lo anterior y añade:
- Tabla `public.accounts` con RLS y políticas.
- Gestión de cuentas contables en Admin (crear, editar, eliminar).
- Transacciones usan cuentas **dinámicas** desde la DB.
- Landing page en `/landing` con botón **Iniciar sesión**.

## Variables de entorno
```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
VITE_SUPABASE_FUNCTIONS_URL=https://<PROJECT_REF>.functions.supabase.co
```

## Esquema
Ejecuta `schema.sql` en Supabase.

## Functions
Despliega las mismas: `admin-create-user`, `admin-delete-user`, `generate-report`.
