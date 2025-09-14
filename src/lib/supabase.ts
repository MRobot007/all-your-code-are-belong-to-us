// Local storage based authentication system
const USERS_KEY = 'attendance_users'
const CURRENT_USER_KEY = 'current_user'
const SESSIONS_KEY = 'attendance_sessions'
const RECORDS_KEY = 'attendance_records'

// Database types
export interface User {
  id: string
  email: string
  password: string
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

// Initialize demo data
const initializeDemoData = () => {
  const users = getAllUsers()
  if (users.length === 0) {
    // Create demo admin user
    const adminUser: User = {
      id: 'admin-1',
      email: 'admin@attendance.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    // Create demo student users
    const studentUsers: User[] = [
      {
        id: 'student-1',
        email: 'john@student.com',
        password: 'student123',
        name: 'John Doe',
        enrollment_no: 'EN001',
        semester: '3',
        branch: 'Computer',
        course: 'BE',
        role: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'student-2',
        email: 'jane@student.com',
        password: 'student123',
        name: 'Jane Smith',
        enrollment_no: 'EN002',
        semester: '3',
        branch: 'Computer',
        course: 'BE',
        role: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ]
    
    // Save demo users
    const allUsers = [adminUser, ...studentUsers]
    localStorage.setItem(USERS_KEY, JSON.stringify(allUsers))
  }
}

// Local storage helpers
export const getCurrentUser = async (): Promise<User | null> => {
  initializeDemoData()
  const userData = localStorage.getItem(CURRENT_USER_KEY)
  return userData ? JSON.parse(userData) : null
}

export const signOut = async () => {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export const getAllUsers = (): User[] => {
  const users = localStorage.getItem(USERS_KEY)
  return users ? JSON.parse(users) : []
}

export const saveUser = (user: User) => {
  const users = getAllUsers()
  const existingIndex = users.findIndex(u => u.id === user.id)
  if (existingIndex >= 0) {
    users[existingIndex] = user
  } else {
    users.push(user)
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export const authenticateUser = (email: string, password: string): User | null => {
  initializeDemoData()
  const users = getAllUsers()
  return users.find(u => u.email === email && u.password === password) || null
}

export const getAllSessions = (): AttendanceSession[] => {
  const sessions = localStorage.getItem(SESSIONS_KEY)
  return sessions ? JSON.parse(sessions) : []
}

export const saveSession = (session: AttendanceSession) => {
  const sessions = getAllSessions()
  const existingIndex = sessions.findIndex(s => s.id === session.id)
  if (existingIndex >= 0) {
    sessions[existingIndex] = session
  } else {
    sessions.push(session)
  }
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

export const getAllRecords = (): AttendanceRecord[] => {
  const records = localStorage.getItem(RECORDS_KEY)
  return records ? JSON.parse(records) : []
}

export const saveRecord = (record: AttendanceRecord) => {
  const records = getAllRecords()
  records.push(record)
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}