-- =============================================================================
-- "Cornudos sin Novia" — esquema completo del backend (Supabase / Postgres)
--
-- Tablas con prefijo joda_ para poder convivir aisladas dentro de un proyecto
-- Supabase compartido (cuota free: 2 proyectos activos por cuenta). Si algún
-- día se muda a un proyecto propio, este archivo se aplica tal cual.
--
-- Diseño:
--   * Columnas camelCase (quoted) → mapean 1:1 con los tipos TS del frontend
--     (src/types.ts); to_jsonb() devuelve las claves exactas y el cliente
--     escribe los objetos sin mapeo.
--   * Sin Supabase Auth: login por PIN a nivel de app (grupo cerrado de
--     amigos). RLS abierto a anon: cualquiera con la anon key puede leer y
--     escribir estas tablas (¡solo estas!). Es una app de joda, no un banco.
--   * joda_get_db() devuelve TODA la db en un jsonb (una sola llamada).
--   * Realtime habilitado en todas las tablas joda_.
--   * Fechas como text ISO (las genera el cliente) — pragmático a propósito.
-- =============================================================================

create table public.joda_profiles (
  id text primary key,
  "displayName" text not null,
  avatar text not null default '',
  emoji text not null default '😎',
  color text not null default '#a855f7',
  pin text not null,
  "createdAt" text not null
);

create table public.joda_trago_tipos (
  id text primary key,
  codigo text not null unique,
  nombre text not null,
  icono text not null,
  "puntosPorUnidad" numeric not null default 1,
  orden int not null default 1
);

create table public.joda_config (
  id int primary key default 1,
  "puntosConfig" jsonb not null
);

create table public.joda_salidas (
  id text primary key,
  fecha text not null,
  lugar text not null default '',
  notas text not null default '',
  "creadoPor" text not null,
  participantes jsonb not null default '[]',
  "retoActivoId" text,
  "mvpGanadorId" text,
  "createdAt" text not null
);

create table public.joda_registros_trago (
  id text primary key,
  "salidaId" text not null,
  "profileId" text not null,
  "tragoCodigo" text not null,
  cantidad int not null default 0,
  unique ("salidaId", "profileId", "tragoCodigo")
);

create table public.joda_rechazos (
  id text primary key,
  "salidaId" text not null,
  "profileId" text not null,
  cantidad int not null default 0,
  unique ("salidaId", "profileId")
);

create table public.joda_mvp_votos (
  id text primary key,
  "salidaId" text not null,
  "votanteId" text not null,
  "candidatoId" text not null,
  unique ("salidaId", "votanteId")
);

create table public.joda_reto_propuestas (
  id text primary key,
  "salidaId" text not null,
  "propuestoPor" text not null,
  texto text not null,
  "createdAt" text not null
);

create table public.joda_reto_votos (
  id text primary key,
  "salidaId" text not null,
  "propuestaId" text not null,
  "votanteId" text not null,
  unique ("salidaId", "votanteId")
);

create table public.joda_reto_cumplimientos (
  id text primary key,
  "retoPropuestaId" text not null,
  "profileId" text not null,
  estado text not null default 'pendiente',
  "createdAt" text not null,
  unique ("retoPropuestaId", "profileId")
);

create table public.joda_reto_confirmacion_votos (
  id text primary key,
  "cumplimientoId" text not null,
  "votanteId" text not null,
  voto boolean not null,
  unique ("cumplimientoId", "votanteId")
);

create table public.joda_apuestas (
  id text primary key,
  "salidaId" text not null,
  "propuestaPor" text not null,
  texto text not null,
  cuota numeric not null default 1.5,
  estado text not null default 'abierta',
  "createdAt" text not null
);

create table public.joda_apuesta_participaciones (
  id text primary key,
  "apuestaId" text not null,
  "profileId" text not null,
  lado boolean not null,
  "puntosApostados" int not null,
  unique ("apuestaId", "profileId")
);

create table public.joda_apuesta_votos_resolucion (
  id text primary key,
  "apuestaId" text not null,
  "votanteId" text not null,
  voto boolean not null,
  unique ("apuestaId", "votanteId")
);

create table public.joda_media_items (
  id text primary key,
  "salidaId" text not null,
  "subidoPor" text not null,
  "dataUrl" text not null,
  tipo text not null default 'foto',
  "createdAt" text not null
);

create table public.joda_media_reacciones (
  id text primary key,
  "mediaId" text not null,
  "profileId" text not null,
  emoji text not null,
  unique ("mediaId", "profileId")
);

create table public.joda_media_comentarios (
  id text primary key,
  "mediaId" text not null,
  "profileId" text not null,
  texto text not null,
  "createdAt" text not null
);

create table public.joda_insignias_otorgadas (
  id text primary key,
  "profileId" text not null,
  "insigniaCodigo" text not null,
  "salidaId" text,
  "otorgadaEn" text not null
);

-- ---------------- RLS: abierto a anon (app privada entre amigos) -------------
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'joda\_%' escape '\'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "joda_open_all" on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ---------------- Seeds de configuración -------------------------------------
insert into public.joda_trago_tipos (id, codigo, nombre, icono, "puntosPorUnidad", orden) values
  ('cerveza', 'cerveza', 'Cerveza', '🍺', 1, 1),
  ('fernet',  'fernet',  'Fernet',  '🥃', 2, 2),
  ('whisky',  'whisky',  'Whisky',  '🥃', 3, 3),
  ('ron',     'ron',     'Ron',     '🍹', 3, 4);

insert into public.joda_config (id, "puntosConfig")
values (1, '{"rechazo": 1, "mvpBonus": 50, "retoBonus": 120, "puntosIniciales": 1000, "codigoGrupo": "4444"}');

-- ---------------- RPC: toda la DB del app en una sola llamada ----------------
create or replace function public.joda_get_db()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'version', 1,
    'profiles',              coalesce((select jsonb_agg(to_jsonb(t) order by t."createdAt") from joda_profiles t), '[]'::jsonb),
    'tragoTipos',            coalesce((select jsonb_agg(to_jsonb(t) order by t.orden) from joda_trago_tipos t), '[]'::jsonb),
    'puntosConfig',          coalesce((select "puntosConfig" from joda_config where id = 1), '{"rechazo":1,"mvpBonus":50,"retoBonus":120}'::jsonb),
    'salidas',               coalesce((select jsonb_agg(to_jsonb(t)) from joda_salidas t), '[]'::jsonb),
    'registrosTrago',        coalesce((select jsonb_agg(to_jsonb(t)) from joda_registros_trago t), '[]'::jsonb),
    'rechazos',              coalesce((select jsonb_agg(to_jsonb(t)) from joda_rechazos t), '[]'::jsonb),
    'mvpVotos',              coalesce((select jsonb_agg(to_jsonb(t)) from joda_mvp_votos t), '[]'::jsonb),
    'retoPropuestas',        coalesce((select jsonb_agg(to_jsonb(t)) from joda_reto_propuestas t), '[]'::jsonb),
    'retoVotos',             coalesce((select jsonb_agg(to_jsonb(t)) from joda_reto_votos t), '[]'::jsonb),
    'retoCumplimientos',     coalesce((select jsonb_agg(to_jsonb(t)) from joda_reto_cumplimientos t), '[]'::jsonb),
    'retoConfirmacionVotos', coalesce((select jsonb_agg(to_jsonb(t)) from joda_reto_confirmacion_votos t), '[]'::jsonb),
    'apuestas',              coalesce((select jsonb_agg(to_jsonb(t)) from joda_apuestas t), '[]'::jsonb),
    'apuestaParticipaciones',coalesce((select jsonb_agg(to_jsonb(t)) from joda_apuesta_participaciones t), '[]'::jsonb),
    'apuestaVotosResolucion',coalesce((select jsonb_agg(to_jsonb(t)) from joda_apuesta_votos_resolucion t), '[]'::jsonb),
    'mediaItems',            coalesce((select jsonb_agg(to_jsonb(t)) from joda_media_items t), '[]'::jsonb),
    'mediaReacciones',       coalesce((select jsonb_agg(to_jsonb(t)) from joda_media_reacciones t), '[]'::jsonb),
    'mediaComentarios',      coalesce((select jsonb_agg(to_jsonb(t)) from joda_media_comentarios t), '[]'::jsonb),
    'insigniasOtorgadas',    coalesce((select jsonb_agg(to_jsonb(t)) from joda_insignias_otorgadas t), '[]'::jsonb)
  );
$$;

grant execute on function public.joda_get_db() to anon, authenticated;

-- ---------------- Realtime ---------------------------------------------------
alter publication supabase_realtime add table
  public.joda_profiles, public.joda_trago_tipos, public.joda_config,
  public.joda_salidas, public.joda_registros_trago, public.joda_rechazos,
  public.joda_mvp_votos, public.joda_reto_propuestas, public.joda_reto_votos,
  public.joda_reto_cumplimientos, public.joda_reto_confirmacion_votos,
  public.joda_apuestas, public.joda_apuesta_participaciones,
  public.joda_apuesta_votos_resolucion, public.joda_media_items,
  public.joda_media_reacciones, public.joda_media_comentarios,
  public.joda_insignias_otorgadas;

-- ---------------- Storage: bucket público para fotos/videos/avatares ---------
insert into storage.buckets (id, name, public, file_size_limit)
values ('joda-media', 'joda-media', true, 44040192) -- 42 MB
on conflict (id) do nothing;

create policy "joda_media_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'joda-media');

create policy "joda_media_insert"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'joda-media');

create policy "joda_media_update"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'joda-media')
  with check (bucket_id = 'joda-media');

create policy "joda_media_delete"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'joda-media');
