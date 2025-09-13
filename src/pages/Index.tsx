import { useAuth } from '@/contexts/AuthContext'
import { AuthForm } from '@/components/AuthForm'
import { Layout } from '@/components/Layout'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { StudentDashboard } from '@/components/student/StudentDashboard'

const Index = () => {
  const { user } = useAuth()

  if (!user) {
    return <AuthForm />
  }

  return (
    <Layout>
      {user.role === 'admin' ? <AdminDashboard /> : <StudentDashboard />}
    </Layout>
  )
};

export default Index;
