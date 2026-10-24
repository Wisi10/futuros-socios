import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Cliente que consulta con la sesion del socio logueado (rol authenticated).
// No depende de la anon key con acceso abierto ni del service_role.
export function supabaseForUser(token) {
  return createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
