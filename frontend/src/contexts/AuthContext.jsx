import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(() => JSON.parse(localStorage.getItem('user') || 'null'))
  const [loading, setLoading] = useState(false)

  // On mount, refresh user from /api/auth/me to pick up is_admin + other DB changes
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || !user) return
    api.get('/auth/me')
      .then(({ data }) => {
        const refreshed = { ...user, ...data }
        localStorage.setItem('user', JSON.stringify(refreshed))
        setUser(refreshed)
      })
      .catch(() => {
        // Token expired / user banned — force logout
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      })
  }, []) // only on mount

  const login = async (username, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return { success: true }
    } catch (err) {
      const d = err.response?.data || {}
      return { success: false, error: d.error || 'Login failed', field: d.field }
    } finally { setLoading(false) }
  }

  const register = async (email, password, username) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { email, password, username })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return { success: true }
    } catch (err) {
      const d = err.response?.data || {}
      return { success: false, error: d.error || 'Registration failed', field: d.field }
    } finally { setLoading(false) }
  }

  // Call after profile update so Navbar reflects changes immediately
  const updateUser = (partial) => {
    const merged = { ...user, ...partial }
    localStorage.setItem('user', JSON.stringify(merged))
    setUser(merged)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
