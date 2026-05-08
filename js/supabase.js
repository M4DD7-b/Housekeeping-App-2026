// js/supabase.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://zuypqnujvmzjksfqnfxr.supabase.co'
const supabaseAnonKey = 'sb_publishable_-dSQfviXUl9BBAIgjAAueQ_W2E9vgvO'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)