import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const FieldError = ({ msg }) =>
  msg ? <p className="text-red-400 text-xs mt-1">{msg}</p> : null

// Password strength indicator
const PASSWORD_RULES = [
  { label: 'At least 8 characters',    test: (p) => p.length >= 8     },
  { label: 'One uppercase letter',      test: (p) => /[A-Z]/.test(p)  },
  { label: 'One number',               test: (p) => /[0-9]/.test(p)  },
]

function PasswordStrength({ password }) {
  if (!password) return null
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length
  const colors = ['bg-red-500', 'bg-yellow-500', 'bg-green-500']
  const labels = ['Weak', 'Fair', 'Strong']
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {PASSWORD_RULES.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300
            ${i < passed ? colors[passed - 1] : 'bg-white/10'}`} />
        ))}
      </div>
      <div className="space-y-0.5">
        {PASSWORD_RULES.map(r => (
          <div key={r.label} className="flex items-center gap-1.5">
            <span className={`text-[10px] ${r.test(password) ? 'text-green-400' : 'text-gray-600'}`}>
              {r.test(password) ? '✓' : '○'}
            </span>
            <span className={`text-[10px] ${r.test(password) ? 'text-gray-400' : 'text-gray-600'}`}>
              {r.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const [form, setForm]     = useState({ email: '', username: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverErr, setServerErr] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { register, loading } = useAuth()
  const navigate              = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
    setServerErr('')
  }

  const validate = () => {
    const errs = {}
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const userRx  = /^[a-zA-Z0-9_]+$/

    if (!form.email)               errs.email    = 'Email is required'
    else if (!emailRx.test(form.email)) errs.email = 'Enter a valid email address'

    if (!form.username)            errs.username = 'Username is required'
    else if (form.username.length < 3 || form.username.length > 20)
                                   errs.username = 'Username must be 3–20 characters'
    else if (!userRx.test(form.username))
                                   errs.username = 'Only letters, numbers, and underscores'

    if (!form.password)            errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'At least 8 characters required'
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Add at least one uppercase letter'
    else if (!/[0-9]/.test(form.password)) errs.password = 'Add at least one number'

    if (!form.confirm)             errs.confirm  = 'Please confirm your password'
    else if (form.confirm !== form.password) errs.confirm = 'Passwords do not match'

    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerErr('')
    const errs = validate()
    if (Object.keys(errs).length > 0) return setErrors(errs)

    const result = await register(form.email, form.password, form.username)
    if (result.success) navigate('/discover')
    else {
      if (result.field) setErrors({ [result.field]: result.error })
      else setServerErr(result.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8">
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

          {serverErr && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {serverErr}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" autoComplete="email"
                className={`input ${errors.email ? 'border-red-500' : ''}`} />
              <FieldError msg={errors.email} />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Username</label>
              <input name="username" type="text" value={form.username} onChange={handleChange}
                placeholder="cinelover42 (3-20 chars)" autoComplete="username"
                className={`input ${errors.username ? 'border-red-500' : ''}`} />
              <FieldError msg={errors.username} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input name="password" type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={handleChange} placeholder="••••••••" autoComplete="new-password"
                  className={`input pr-10 ${errors.password ? 'border-red-500' : ''}`} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPw
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
              <FieldError msg={errors.password} />
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
              <input name="confirm" type={showPw ? 'text' : 'password'} value={form.confirm}
                onChange={handleChange} placeholder="••••••••" autoComplete="new-password"
                className={`input ${errors.confirm ? 'border-red-500' : ''}`} />
              <FieldError msg={errors.confirm} />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Creating account…' : 'Get Started 🚀'}
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
