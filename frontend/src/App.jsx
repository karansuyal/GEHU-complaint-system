import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import MobileTabBar from './components/MobileTabBar'
import ProtectedRoute from './components/ProtectedRoute'
import PushSetup from './components/PushSetup'
import { useAuth } from './context/AuthContext'

import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import StudentDashboard from './pages/StudentDashboard'
import NewComplaint from './pages/NewComplaint'
import ComplaintDetail from './pages/ComplaintDetail'
import WardenDashboard from './pages/WardenDashboard'
import AdminDashboard from './pages/AdminDashboard'
import AdminComplaints from './pages/AdminComplaints'
import AdminStaff from './pages/AdminStaff'

function Home() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const path = user.role === 'admin' ? '/admin' : user.role === 'warden' ? '/warden' : '/dashboard'
  return <Navigate to={path} replace />
}

export default function App() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen bg-paper">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#17211D',
            color: '#FAF9F6',
            fontSize: '0.875rem',
            borderRadius: '6px'
          }
        }}
      />
      {user && <PushSetup />}
      <Navbar />
      <div className={user?.role === 'student' || user?.role === 'admin' ? 'pb-20 sm:pb-0' : ''}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complaints/new"
          element={
            <ProtectedRoute roles={['student']}>
              <NewComplaint />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complaints/:id"
          element={
            <ProtectedRoute roles={['student', 'warden', 'admin']}>
              <ComplaintDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden"
          element={
            <ProtectedRoute roles={['warden']}>
              <WardenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/complaints"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminComplaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminStaff />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>
      {(user?.role === 'student' || user?.role === 'admin') && <MobileTabBar />}
    </div>
  )
}
