import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, authenticateUser, saveUser, type User } from '@/lib/supabase'
import { Loading } from '@/components/ui/loading'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (userData: SignUpData) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

interface SignUpData {
  email: string
  password: string
  name: string
  enrollmentNo?: string
  semester?: string
  branch?: string
  course?: string
  role: 'admin' | 'student'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session from localStorage
    getCurrentUser().then(setUser).finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const user = authenticateUser(email, password)
      if (!user) return { error: 'Invalid email or password' }
      
      localStorage.setItem('current_user', JSON.stringify(user))
      setUser(user)
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const signUp = async (userData: SignUpData) => {
    try {
      // Check if user already exists
      const existingUsers = JSON.parse(localStorage.getItem('attendance_users') || '[]')
      if (existingUsers.find((u: User) => u.email === userData.email)) {
        return { error: 'User already exists with this email' }
      }

      // Create new user
      const newUser: User = {
        id: crypto.randomUUID(),
        email: userData.email,
        password: userData.password,
        name: userData.name,
        enrollment_no: userData.enrollmentNo,
        semester: userData.semester,
        branch: userData.branch,
        course: userData.course,
        role: userData.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      saveUser(newUser)
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    localStorage.removeItem('current_user')
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}