# Cornudos sin Novia — Guía del proyecto

PWA (web instalable en el celu) para un **grupo cerrado de amigos**: ranking gamificado de
"estadísticas de joda". Registran tragos, rechazos, MVP, apuestas, retos y fotos/videos por
salida; el ranking acumula todo. Todo en **español paraguayo ("vos")**.

## Reglas de marca (pedidas por Sebas — respetarlas en futuros cambios)

- La app dice **solo "Cornudos sin Novia"**: sin eslogan, sin subtítulos de marketing.
- **Sin emojis decorativos** en la UI ("que no se note que es IA"): nav con SVG, avatares
  con inicial sobre color, medallas del top 3 por color, contadores con letra+color.
  Se conservan SOLO los funcionales: reacciones a fotos (tipo WhatsApp) y glifos ✓ ✗ ✕ ✎ ⌫.
- Ícono de la app = **foto del grupo** (`scripts/icon-source.jpeg`, vino de Descargas).
  Regenerar variantes con `node scripts/make-icons.mjs` (sharp, recorte con foco automático).

## Estado actual (2026-07-14) — v1.1.1 EN PRODUCCIÓN

- **URL**: https://sebasthianlopez.github.io/cornudos-sin-novia/
- **Frontend**: GitHub Pages, repo público `SebasthianLopez/cornudos-sin-novia`
  (`main` = código, `gh-pages` = build). ⚠ Repo público ⇒ la foto del grupo es visible.
- **Backend**: Supabase — tablas `joda_` + bucket Storage `joda-media` (42MB/archivo), ya
  aplicado (`supabase/schema.sql`). El proyecto Supabase se comparte con otro proyecto del
  autor por la cuota free (2 proyectos activos por cuenta — NO por org; crear org nueva no
  sirve). Tablas `joda_` aisladas con RLS propio.
- Sebas ya está registrado (primer perfil = "admin" informal) y validó la sync en prod.
- `npm run dev` → http://localhost:5173 · `npm run build` → `dist/` · `npm audit` limpio.

## Funcionalidad clave

- **Registro con código de invitación** (hoy `4444`; vive en `joda_config.puntosConfig.codigoGrupo`,
  se cambia por SQL). El primer usuario no necesita código. Login por PIN de 4 dígitos a
  nivel de app (sin Supabase Auth; seguridad "entre amigos", decisión consciente).
- **Invitar amigos**: Perfil → Invitar amigos (link + código, share/copy).
- **Puntos**: todos arrancan con `puntosIniciales` (default 1000). Tragos/rechazo/MVP/reto
  configurables en Perfil → Configurar puntos (persisten en `joda_config`; Sebas ya los
  tocó en prod: los valores REALES viven en la DB, no asumir los defaults).
- **Apuestas**: acertar paga NETO `apostado×(cuota−1)`; errar resta lo apostado (el ranking
  puede caer bajo los iniciales, a propósito). La cuota acepta coma decimal.
- **Apuesta de la casa**: al crear una salida se genera una apuesta random (plantillas en
  `actions.ts` → `APUESTAS_CASA`, `propuestaPor: 'app'`, cuota aleatoria). Cualquiera puede
  cancelarla.
- Retos (propuesta→voto→cumplí→confirmación grupal), MVP votado, fotos/videos con
  reacciones y comentarios, insignias, racha, Wrapped anual.

## Stack y arquitectura

- **Vite 8 + React 19 + TS 6 + Tailwind v3 + supabase-js**. Mobile-first `max-w-md`,
  tema oscuro. ⚠ tsconfig: `verbatimModuleSyntax` (usar `import type`) y `erasableSyntaxOnly`.
- `src/types.ts` mapea **1:1** a las tablas `joda_*` (columnas camelCase con quotes).
- `src/lib/store.ts` — **el corazón**: copia local optimista + diff por tabla → **outbox
  persistente** en localStorage (sobrevive cortes de señal) + RPC `joda_get_db()` (toda la
  DB en 1 llamada) + realtime + refetch en focus/60s. `actions.ts` no sabe de red.
  Tablas con clave natural usan upsert `onConflict` (no duplican entre celulares).
- `src/lib/storage.ts` — subidas al bucket (URL pública en la fila; fallback dataURL).
- Resoluciones grupales (MVP/reto/apuesta por mayoría) se computan en el cliente del último
  voto; idempotentes.
- **Seguridad**: CSP en `index.html` (solo código propio; red solo a nuestro Supabase),
  HTTPS, 0 vulnerabilidades npm. Anon key pública por diseño; PINs en texto plano en DB
  (avisar que no usen PINs de tarjeta).
- Mobile: taps `touch-action: manipulation`, sin user-select en botones, sin overflow-x,
  `overscroll-behavior-y: none`, sheets con `dvh` + overscroll-contain, safe areas iOS.

## Deploy de updates (flujo probado)

1. `npm run build`
2. Copiar `dist/` a una carpeta temporal + `.nojekyll`, `git init -b gh-pages`, commit,
   `git push --force` a `gh-pages` del repo.
3. Verificar con curl que el HTML publicado referencia el bundle nuevo (tarda ~30s).
4. La app instalada se actualiza sola al reabrirse con señal (SW network-first). Si se
   tocan assets del shell, bumpear `CACHE` en `public/sw.js` (hoy `cornudos-v3`).

Si se muda a un proyecto Supabase propio: aplicar `supabase/schema.sql` tal cual y cambiar
URL/key en `src/lib/supabase.ts`.
