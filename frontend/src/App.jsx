import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LandingPage         from './pages/LandingPage'
import LoginPage           from './pages/LoginPage'
import RegisterPage        from './pages/RegisterPage'
import HomePage            from './pages/HomePage'
import RecommendationsPage from './pages/RecommendationsPage'
import MovieDetailPage     from './pages/MovieDetailPage'
import PersonPage          from './pages/PersonPage'
import ProfilePage         from './pages/ProfilePage'
import DashboardPage       from './pages/DashboardPage'
import Layout              from './components/Layout'

// Redirect logged-in users away from /login and /register
const PublicRoute = ({ children }) => {
  const { user } = useAuth()
  return !user ? children : <Navigate to="/discover" replace />
}

// Redirect unauthenticated users to /login
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/"         element={<LandingPage />} />
    <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

    {/* Protected routes — all inside the Layout shell */}
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/discover"        element={<HomePage />} />
      <Route path="/recommendations" element={<RecommendationsPage />} />
      <Route path="/movie/:id"       element={<MovieDetailPage />} />
      <Route path="/person/:id"      element={<PersonPage />} />
      <Route path="/profile"         element={<ProfilePage />} />
      <Route path="/dashboard"       element={<DashboardPage />} />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
