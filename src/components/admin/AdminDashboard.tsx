import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  QrCode, 
  Users, 
  Calendar, 
  Download,
  Plus,
  Eye,
  EyeOff,
  Activity,
  TrendingUp
} from 'lucide-react'
import { supabase, type AttendanceSession, type AttendanceRecord } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Loading } from '@/components/ui/loading'
import QRCode from 'qrcode'
import * as XLSX from 'xlsx'

export function AdminDashboard() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSession: 0,
    totalStudents: 0,
    todayAttendance: 0
  })
  const [loading, setLoading] = useState(true)
  const [newSessionName, setNewSessionName] = useState('')
  const [generatingQR, setGeneratingQR] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load sessions
      const { data: sessionsData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      // Load attendance records with user data
      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select(`
          *,
          user:users(*),
          session:attendance_sessions(*)
        `)
        .order('timestamp', { ascending: false })

      // Load stats
      const { count: studentsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      const today = new Date().toISOString().split('T')[0]
      const { count: todayAttendanceCount } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T23:59:59`)

      setSessions(sessionsData || [])
      setAttendanceData(attendanceData || [])
      setStats({
        totalSessions: sessionsData?.length || 0,
        activeSession: sessionsData?.filter(s => s.is_active)?.length || 0,
        totalStudents: studentsCount || 0,
        todayAttendance: todayAttendanceCount || 0
      })
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const generateQRSession = async () => {
    if (!newSessionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session name",
        variant: "destructive"
      })
      return
    }

    setGeneratingQR(newSessionName)
    try {
      // Generate unique session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Generate QR code data URL
      const qrCodeDataUrl = await QRCode.toDataURL(sessionId, {
        width: 300,
        margin: 2,
        color: {
          dark: '#3B82F6',
          light: '#FFFFFF'
        }
      })

      // Save session to database
      const { error } = await supabase
        .from('attendance_sessions')
        .insert({
          name: newSessionName,
          qr_code: sessionId,
          is_active: true
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "QR code session generated successfully!",
        variant: "default"
      })
      
      setNewSessionName('')
      loadData()
    } catch (error) {
      console.error('Error generating QR:', error)
      toast({
        title: "Error",
        description: "Failed to generate QR code session",
        variant: "destructive"
      })
    } finally {
      setGeneratingQR('')
    }
  }

  const toggleSession = async (sessionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ is_active: !currentStatus })
        .eq('id', sessionId)

      if (error) throw error

      toast({
        title: "Success",
        description: `Session ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
        variant: "default"
      })
      
      loadData()
    } catch (error) {
      console.error('Error toggling session:', error)
      toast({
        title: "Error",
        description: "Failed to update session status",
        variant: "destructive"
      })
    }
  }

  const downloadQR = async (session: AttendanceSession) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(session.qr_code, {
        width: 400,
        margin: 3,
        color: {
          dark: '#3B82F6',
          light: '#FFFFFF'
        }
      })

      // Create download link
      const link = document.createElement('a')
      link.download = `qr-${session.name.replace(/\s+/g, '-')}.png`
      link.href = qrCodeDataUrl
      link.click()
    } catch (error) {
      console.error('Error downloading QR:', error)
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive"
      })
    }
  }

  const exportAttendance = () => {
    if (attendanceData.length === 0) {
      toast({
        title: "No Data",
        description: "No attendance data to export",
        variant: "destructive"
      })
      return
    }

    const exportData = attendanceData.map(record => ({
      'Student Name': record.user?.name || 'N/A',
      'Email': record.user?.email || 'N/A',
      'Enrollment No': record.user?.enrollment_no || 'N/A',
      'Branch': record.user?.branch || 'N/A',
      'Semester': record.user?.semester || 'N/A',
      'Course': record.user?.course || 'N/A',
      'Session': record.session?.name || 'N/A',
      'Status': record.status,
      'Timestamp': new Date(record.timestamp).toLocaleString()
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
    XLSX.writeFile(wb, `attendance-${new Date().toISOString().split('T')[0]}.xlsx`)

    toast({
      title: "Success",
      description: "Attendance data exported successfully!",
      variant: "default"
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage attendance sessions and view analytics</p>
        </div>
        <Button 
          onClick={exportAttendance}
          className="gradient-success text-success-foreground hover:opacity-90"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <QrCode className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalSessions}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.activeSession}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.todayAttendance}</div>
          </CardContent>
        </Card>
      </div>

      {/* Generate QR Section */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Generate New QR Session
          </CardTitle>
          <CardDescription>
            Create a new attendance session with a unique QR code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter session name (e.g., 'Math Class - Morning')"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={generateQRSession}
              disabled={!!generatingQR}
              className="gradient-primary text-primary-foreground hover:opacity-90"
            >
              {generatingQR ? <Loading size="sm" className="mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
              Generate QR
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle>QR Code Sessions</CardTitle>
          <CardDescription>
            Manage your attendance sessions and download QR codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sessions created yet. Generate your first QR code session above.
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-secondary/50 transition-smooth"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg gradient-primary">
                      <QrCode className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{session.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={session.is_active ? "default" : "secondary"}
                      className={session.is_active ? "gradient-success text-success-foreground" : ""}
                    >
                      {session.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadQR(session)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSession(session.id, session.is_active)}
                    >
                      {session.is_active ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Attendance */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>
            Latest attendance records from all sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records yet.
            </div>
          ) : (
            <div className="space-y-3">
              {attendanceData.slice(0, 10).map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-3 border border-border/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    <div>
                      <p className="font-medium text-foreground">{record.user?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.session?.name} • {new Date(record.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge className="gradient-success text-success-foreground">
                    Present
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}