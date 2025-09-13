import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://your-project.supabase.co'
const supabaseKey = 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface User {
  id: string
  email: string
  name: string
  enrollment_no?: string
  semester?: string
  branch?: string
  course?: string
  role: 'admin' | 'student'
  created_at: string
  updated_at: string
}

export interface AttendanceSession {
  id: string
  name: string
  qr_code: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: string
  user_id: string
  session_id: string
  timestamp: string
  status: 'present' | 'absent'
  user?: User
  session?: AttendanceSession
}

// Auth helpers
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return data
}

export const signOut = async () => {
  await supabase.auth.signOut()
}