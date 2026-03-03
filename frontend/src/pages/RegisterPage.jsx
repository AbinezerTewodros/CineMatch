import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const [form, setForm]    = useState({ email: '', username: '', password: '', confirm: '' })
  const [error, setError]  = useState('')
  const { register, loading } = useAuth()
  const navigate           = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Passwords do not match')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    const result = await register(form.email, form.password, form.username)
    if (result.success) navigate('/')
    else setError(result.error)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-800/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md px-4 animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gradient mb-2">CineMatch</h1>
          <p className="text-gray-400 text-sm">Your personal AI movie guide</p>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-6">Create account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input name="email" type="email" required placeholder="you@example.com"
                value={form.email} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Username</label>
              <input name="username" type="text" required placeholder="cinelover42"
                value={form.username} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input name="password" type="password" required placeholder="At least 6 characters"
                value={form.password} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
              <input name="confirm" type="password" required placeholder="••••••••"
                value={form.confirm} onChange={handleChange} className="input" />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Creating account...' : 'Get Started'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-red-400 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
