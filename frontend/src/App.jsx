import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import { auth } from './api/client'

function ProtectedRoute({ children }) {
  if (!auth.isLoggedIn()) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/signup"         element={<LoginPage />} />
        <Route path="/auth/callback"  element={<AuthCallback />} />
        <Route path="/auth/error"     element={<AuthCallback />} />
        <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*"               element={<Navigate to={auth.isLoggedIn() ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
