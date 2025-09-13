import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Camera, 
  CheckCircle, 
  Calendar,
  Award,
  TrendingUp,
  QrCode,
  AlertCircle,
  Scan,
  X
} from 'lucide-react'
import { supabase, type AttendanceRecord } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Loading } from '@/components/ui/loading'
import { Html5QrcodeScanner } from 'html5-qrcode'

export function StudentDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState({
    totalAttended: 0,
    thisMonth: 0,
    attendanceRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    if (user) {
      loadAttendanceData()
    }
  }, [user])

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error)
      }
    }
  }, [scanner])

  const loadAttendanceData = async () => {
    try {
      const { data } = await supabase
        .from('attendance_records')
        .select(`
          *,
          session:attendance_sessions(*)
        `)
        .eq('user_id', user?.id)
        .order('timestamp', { ascending: false })

      const records = data || []
      setAttendanceHistory(records)

      // Calculate stats
      const totalAttended = records.length
      const thisMonth = records.filter(r => {
        const recordDate = new Date(r.timestamp)
        const now = new Date()
        return recordDate.getMonth() === now.getMonth() && 
               recordDate.getFullYear() === now.getFullYear()
      }).length

      setStats({
        totalAttended,
        thisMonth,
        attendanceRate: totalAttended > 0 ? Math.round((totalAttended / totalAttended) * 100) : 0
      })
    } catch (error) {
      console.error('Error loading attendance:', error)
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const startScanning = () => {
    setScanning(true)
    
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    )

    html5QrcodeScanner.render(onScanSuccess, onScanError)
    setScanner(html5QrcodeScanner)
  }

  const stopScanning = () => {
    if (scanner) {
      scanner.clear().then(() => {
        setScanning(false)
        setScanner(null)
      }).catch(console.error)
    }
  }

  const onScanSuccess = async (decodedText: string) => {
    console.log('QR Code scanned:', decodedText)
    
    try {
      // Check if session exists and is active
      const { data: session } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('qr_code', decodedText)
        .eq('is_active', true)
        .single()

      if (!session) {
        toast({
          title: "Invalid QR Code",
          description: "This QR code is not valid or the session is inactive",
          variant: "destructive"
        })
        return
      }

      // Check if already marked attendance for this session
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user?.id)
        .eq('session_id', session.id)
        .single()

      if (existingRecord) {
        toast({
          title: "Already Marked",
          description: "You have already marked attendance for this session",
          variant: "destructive"
        })
        return
      }

      // Mark attendance
      const { error } = await supabase
        .from('attendance_records')
        .insert({
          user_id: user?.id,
          session_id: session.id,
          timestamp: new Date().toISOString(),
          status: 'present'
        })

      if (error) throw error

      toast({
        title: "Success!",
        description: `Attendance marked for ${session.name}`,
        variant: "default"
      })

      stopScanning()
      loadAttendanceData()
    } catch (error) {
      console.error('Error marking attendance:', error)
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive"
      })
    }
  }

  const onScanError = (errorMessage: string) => {
    // Ignore frequent scanning errors to avoid spam
    console.log('QR scan error:', errorMessage)
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
          <h1 className="text-3xl font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}!</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.totalAttended}</div>
            <p className="text-xs text-muted-foreground">Sessions attended</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Award className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">Attendance rate</p>
          </CardContent>
        </Card>
      </div>

      {/* QR Scanner Section */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            QR Code Scanner
          </CardTitle>
          <CardDescription>
            Scan QR codes to mark your attendance for class sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!scanning ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-4">
                <Camera className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Ready to scan</h3>
              <p className="text-muted-foreground mb-6">
                Click the button below to open your camera and scan a QR code
              </p>
              <Button 
                onClick={startScanning}
                className="gradient-primary text-primary-foreground hover:opacity-90"
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Scanning
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Scanning for QR Code...</h3>
                <Button variant="ghost" size="sm" onClick={stopScanning}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Position the QR code within the camera frame. The scan will happen automatically.
                </AlertDescription>
              </Alert>

              <div 
                id="qr-reader" 
                className="qr-scanner-container bg-muted rounded-lg overflow-hidden"
              ></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Info */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            {user?.enrollment_no && (
              <div>
                <p className="text-sm text-muted-foreground">Enrollment Number</p>
                <p className="font-medium">{user.enrollment_no}</p>
              </div>
            )}
            {user?.branch && (
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-medium">{user.branch}</p>
              </div>
            )}
            {user?.semester && (
              <div>
                <p className="text-sm text-muted-foreground">Semester</p>
                <p className="font-medium">Semester {user.semester}</p>
              </div>
            )}
            {user?.course && (
              <div>
                <p className="text-sm text-muted-foreground">Course</p>
                <p className="font-medium">{user.course}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>
            Your recent attendance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records yet. Scan a QR code to mark your first attendance!
            </div>
          ) : (
            <div className="space-y-3">
              {attendanceHistory.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-3 border border-border/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    <div>
                      <p className="font-medium text-foreground">{record.session?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(record.timestamp).toLocaleString()}
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