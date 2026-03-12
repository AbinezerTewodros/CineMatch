import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Inline field error
const FieldError = ({ msg }) =>
  msg ? <p className="text-red-400 text-xs mt-1">{msg}</p> : null

export default function LoginPage() {
  const [form, setForm]     = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverErr, setServerErr] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { login, loading }  = useAuth()
  const navigate            = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
    setServerErr('')
  }

  const validate = () => {
    const errs = {}
    if (!form.username.trim()) errs.username = 'Username or email is required'
    if (!form.password)        errs.password = 'Password is required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) return setErrors(errs)

    const result = await login(form.username, form.password)
    if (result.success) navigate('/discover')
    else {
      if (result.field) setErrors({ [result.field]: result.error })
      else setServerErr(result.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-800/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md px-4 animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gradient mb-2">CineMatch</h1>
          <p className="text-gray-400 text-sm">AI-powered movie recommendations</p>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-6">Welcome back</h2>

          {serverErr && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {serverErr}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Username / Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Username or Email</label>
              <input
                name="username" type="text" value={form.username}
                onChange={handleChange} autoComplete="username"
                placeholder="your_username or email@example.com"
                className={`input ${errors.username ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              <FieldError msg={errors.username} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  name="password" type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={handleChange} autoComplete="current-password"
                  placeholder="••••••••"
                  className={`input pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPw
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
              <FieldError msg={errors.password} />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:text-red-400 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
