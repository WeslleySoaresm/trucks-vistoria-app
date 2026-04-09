import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Se uma dessas variáveis estiver vazia, o erro que você mandou acontece
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Erro: Variáveis de ambiente não encontradas!")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)