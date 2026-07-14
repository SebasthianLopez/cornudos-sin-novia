// Cliente Supabase de "Cornudos sin Novia".
//
// El backend son tablas con prefijo joda_ (ver supabase/schema.sql). La app no
// usa Supabase Auth: el login es por PIN a nivel de aplicación (app privada
// entre amigos), así que el cliente va siempre con la anon key.
import { createClient } from '@supabase/supabase-js'

// La anon key es pública por diseño (viaja en el bundle); las tablas joda_
// tienen su propio RLS y no dan acceso a nada más del proyecto.
export const SUPABASE_URL: string =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://aiyadcolohxkaxsrboty.supabase.co'

const SUPABASE_ANON_KEY: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpeWFkY29sb2h4a2F4c3Jib3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjc4NzMsImV4cCI6MjA5NDkwMzg3M30.kGQ0V338SFK6nzjL_4vRPkOByCMUowQiwU9hnPvX0rU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
