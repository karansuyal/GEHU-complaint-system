import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ErrorBoundary'
import MobileTabBar from './components/MobileTabBar'
import Navbar from './components/Navbar'
import OfflineBanner from './components/OfflineBanner'
import ProtectedRoute from './components/ProtectedRoute'
import PushSetup from './components/PushSetup'
import { useAuth } from './context/AuthContext'
import { useTheme } from './hooks/useTheme'
import { roleHome } from './utils/categories'

// Login and the student flow ship in the main bundle (most traffic, phones on
// slow networks). Admin screens pull in the chart library, so they load on demand.
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import StudentDashboard from './pages/StudentDashboard'
import NewComplaint from './pages/NewComplaint'
import ComplaintDetail from './pages/ComplaintDetail'
import WardenDashboard from './pages/WardenDashboard'
import NotFound from './pages/NotFound'

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminComplaints = lazy(() => import('./pages/AdminComplaints'))
const AdminStaff = lazy(() => import('./pages/AdminStaff'))

function Home() {
  const { user } = useAuth()
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />
}

const Fallback = (
  <div className="min-h-[50dvh] flex items-center justify-center" role="status">
    <div className="animate-spin h-7 w-7 border-2 border-accent border-t-transparent rounded-full" />
    <span className="sr-only">Loading…</span>
  </div>
)

const guard = (roles, el) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>

export default function App() {
  const { user } = useAuth()
  const { resolved } = useTheme()
  const hasTabBar = user?.role === 'student' || user?.role === 'admin'

  return (
    <div className="min-h-dvh bg-paper">
      <a href="#main" className="skip-link">Skip to content</a>
      <Toaster
        position="top-center"
        containerStyle={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        toastOptions={{
          duration: 3500,
          style: {
            background: resolved === 'dark' ? '#232F29' : '#17211D',
            color: '#F5F7F5',
            fontSize: '0.875rem',
            borderRadius: '8px',
            maxWidth: 'min(92vw, 420px)'
          }
        }}
      />
      {user && <PushSetup />}
      <Navbar />
      <OfflineBanner />
      {/* Bottom padding keeps content clear of the phone tab bar + home indicator. */}
      <main id="main" className={hasTabBar ? 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0' : 'pb-[env(safe-area-inset-bottom,0px)]'}>
        <ErrorBoundary>
          <Suspense fallback={Fallback}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route path="/dashboard" element={guard(['student'], <StudentDashboard />)} />
              <Route path="/complaints/new" element={guard(['student'], <NewComplaint />)} />
              <Route path="/complaints/:id" element={guard(['student', 'warden', 'admin'], <ComplaintDetail />)} />
              <Route path="/warden" element={guard(['warden'], <WardenDashboard />)} />
              <Route path="/admin" element={guard(['admin'], <AdminDashboard />)} />
              <Route path="/admin/complaints" element={guard(['admin'], <AdminComplaints />)} />
              <Route path="/admin/staff" element={guard(['admin'], <AdminStaff />)} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {hasTabBar && <MobileTabBar />}
    </div>
  )
}
