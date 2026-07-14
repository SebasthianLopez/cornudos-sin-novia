# Cornudos sin Novia — Guía del proyecto

PWA (web instalable en el celu) para un **grupo cerrado de amigos**: ranking gamificado de
"estadísticas de joda". Registran tragos, rechazos, MVP, apuestas, retos y feed de fotos/videos
por salida; el ranking acumula todo. Todo en **español, tono paraguayo ("vos")**.

## Estado actual (2026-07-14) — v1.0 EN PRODUCCIÓN

- **Frontend**: GitHub Pages (deploy del `dist/` a la rama `gh-pages`).
- **Backend**: Supabase — tablas con prefijo `joda_` + bucket Storage `joda-media`
  (ver `supabase/schema.sql`, ya aplicado). El proyecto Supabase se comparte con otro
  proyecto del autor por la cuota free (2 proyectos activos por cuenta); las tablas
  `joda_` están aisladas con su propio RLS y no tocan nada más.
- `npm run dev` → http://localhost:5173 · `npm run build` → `dist/`
- Iconos PNG del manifest se regeneran con `node scripts/make-icons.mjs`.

## Stack

- **Vite 8 + React 19 + TypeScript 6 + Tailwind CSS v3** + `@supabase/supabase-js`.
- Tema oscuro "nightlife". Mobile-first, columna `max-w-md`. PWA a mano
  (`public/manifest.webmanifest` + `public/sw.js`, rutas RELATIVAS para subcarpetas).
- ⚠ `tsconfig.app.json`: `verbatimModuleSyntax` (usar `import type`) y `erasableSyntaxOnly`
  (nada de enums).

## Arquitectura de datos (leer antes de tocar el store)

- `src/types.ts` — modelo de dominio. Mapea **1:1** a las tablas `joda_*` (columnas camelCase
  con quotes en Postgres → cero mapeo cliente/servidor).
- `src/lib/supabase.ts` — cliente (anon key embebida; es pública por diseño).
- `src/lib/store.ts` — **el corazón**: copia local de la DB en memoria + localStorage,
  optimista. `mutate(fn)` aplica el cambio local al instante, hace **diff por tabla** y
  encola upserts/deletes en un **outbox persistente** (sobrevive cortes de señal; se
  re-envía al volver online). `joda_get_db()` (RPC) baja TODA la db en una llamada.
  Realtime (postgres_changes) + focus + intervalo refrescan la copia.
- `src/lib/actions.ts` — todas las mutaciones de dominio (usan `mutate`, no saben de red).
  Las resoluciones grupales (MVP/reto/apuesta por mayoría) se computan en el cliente que
  registra el último voto (idempotentes; con 5 usuarios alcanza).
- `src/lib/storage.ts` — subida de fotos/videos/avatares al bucket (URL pública en la fila;
  si la subida falla, fallback a dataURL).
- Tablas con clave natural (ej. un voto por votante) usan `onConflict` en el upsert y borrado
  por clave natural — así dos celulares no duplican filas.
- **Login**: PIN de 4 dígitos a nivel de app (sin Supabase Auth). Es seguridad "entre
  amigos", no de banco — decisión consciente.

## Reglas de puntos (editables en Perfil → Configurar puntos)

cerveza=1, fernet=2, whisky=3, ron=3 · rechazo=+1 (SUMA) · MVP=+50 · reto cumplido=+120.
Apuestas: ganás `apostado × cuota`, perdés lo apostado (el ranking puede quedar negativo,
a propósito).

## Deploy

- Build: `npm run build` → publicar `dist/` en la rama `gh-pages` del repo.
- El backend ya está aplicado; si se muda a un proyecto Supabase propio: aplicar
  `supabase/schema.sql` tal cual y cambiar URL/key en `src/lib/supabase.ts`.
