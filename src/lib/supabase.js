import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://wplafjrrsknckbebhaod.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbGFmanJyc2tuY2tiZWJoYW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mjc1MTMsImV4cCI6MjA5NzAwMzUxM30.-EueTTD9RCzirhMjKVae0oxjSjk-YwO6DmvfcTLEkl4'
)
