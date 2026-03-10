import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

// ── Avatar options ────────────────────────────────────────────────────────────
const AVATARS = [
  { emoji: '😊', label: 'Happy'        },
  { emoji: '😎', label: 'Cool'         },
  { emoji: '🎬', label: 'Director'     },
  { emoji: '🦁', label: 'Lion'         },
  { emoji: '🐱', label: 'Cat'          },
  { emoji: '👻', label: 'Ghost'        },
  { emoji: '🤖', label: 'Robot'        },
  { emoji: '🦊', label: 'Fox'          },
  { emoji: '🎭', label: 'Masks'        },
  { emoji: '🦄', label: 'Unicorn'      },
  { emoji: '🔥', label: 'Fire'         },
  { emoji: '💎', label: 'Diamond'      },
  { emoji: '🌙', label: 'Moon'         },
  { emoji: '⚡', label: 'Lightning'    },
  { emoji: '🎯', label: 'Target'       },
  { emoji: '🏆', label: 'Trophy'       },
  { emoji: '🐺', label: 'Wolf'         },
  { emoji: '🌈', label: 'Rainbow'      },
  { emoji: '🦋', label: 'Butterfly'    },
  { emoji: '🐲', label: 'Dragon'       },
  { emoji: '🎸', label: 'Guitar'       },
  { emoji: '🎵', label: 'Music'        },
  { emoji: '🌊', label: 'Wave'         },
  { emoji: '🦅', label: 'Eagle'        },
]

// ── Section tab IDs ───────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'info',     icon: '👤', label: 'Edit Profile'    },
  { id: 'password', icon: '🔐', label: 'Change Password' },
  { id: 'account',  icon: 'ℹ️', label: 'Account Info'   },
]

// ── Small helpers ─────────────────────────────────────────────────────────────
const Input = ({ label, hint, ...props }) => (
  <div>
    <label className="block text-sm text-gray-400 mb-1.5 font-medium">{label}</label>
    <input {...props} className="input" />
    {hint && <p className="text-[11px] text-gray-600 mt-1">{hint}</p>}
  </div>
)

const Toast = ({ msg }) => {
  if (!msg.text) return null
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-xl border shadow-2xl
      text-sm font-medium animate-fade-in transition-all
      ${msg.error
        ? 'bg-red-950/90 border-red-700/60 text-red-300'
        : 'bg-green-950/90 border-green-700/60 text-green-300'}`}>
      <span>{msg.error ? '❌' : '✅'}</span>
      {msg.text}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, updateUser }       = useAuth()
  const navigate                   = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeSection = searchParams.get('section') || 'info'
  const setSection    = (s) => setSearchParams({ section: s })

  // Profile edit state
  const [profile, setProfile]   = useState({
    username:     user?.username     || '',
    email:        user?.email        || '',
    avatar_emoji: user?.avatar_emoji || '😊',
  })
  // Password state
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })

  // Feedback
  const [toast, setToast]         = useState({ text: '', error: false })
  const [profSaving, setProfSaving] = useState(false)
  const [pwSaving, setPwSaving]     = useState(false)

  const showToast = (text, error = false) => {
    setToast({ text, error })
    setTimeout(() => setToast({ text: '', error: false }), 3500)
  }

  // Load fresh profile on mount
  useEffect(() => {
    api.get('/auth/me').then(r => {
      const d = r.data
      setProfile({ username: d.username, email: d.email, avatar_emoji: d.avatar_emoji || '😊' })
    }).catch(console.error)
  }, [])

  // ── Save profile ────────────────────────────────────────────────────────────
  const saveProfile = async (e) => {
    e.preventDefault()
    if (!profile.username.trim()) return showToast('Username cannot be empty', true)
    setProfSaving(true)
    try {
      const r = await api.put('/auth/profile', {
        username:     profile.username !== user?.username ? profile.username : undefined,
        avatar_emoji: profile.avatar_emoji,
      })
      updateUser(r.data)         // live update sidebar & navbar
      showToast('Profile updated successfully!')
    } catch (err) {
      showToast(err.response?.data?.error || 'Update failed', true)
    } finally { setProfSaving(false) }
  }

  // ── Change password ─────────────────────────────────────────────────────────
  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm)  return showToast('New passwords do not match', true)
    if (pwForm.newPw.length < 6)          return showToast('New password must be at least 6 characters', true)
    if (!pwForm.current)                  return showToast('Enter your current password', true)
    setPwSaving(true)
    try {
      await api.put('/auth/password', { current_password: pwForm.current, new_password: pwForm.newPw })
      setPwForm({ current: '', newPw: '', confirm: '' })
      showToast('Password changed successfully!')
    } catch (err) {
      showToast(err.response?.data?.error || 'Password change failed', true)
    } finally { setPwSaving(false) }
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto pb-16">
      <Toast msg={toast} />

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 mb-8">
        {/* Big avatar display */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/40 to-purple-700/40
          border-2 border-primary/30 flex items-center justify-center text-4xl shrink-0 shadow-xl">
          {profile.avatar_emoji}
        </div>
        <div>
          <h1 className="text-2xl font-black">{profile.username}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{profile.email}</p>
          <p className="text-gray-600 text-xs mt-1">
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long' }) : '—'}
          </p>
        </div>
      </div>

      {/* ── Section tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-8 w-fit">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeSection === s.id
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'text-gray-400 hover:text-white'}`}>
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── SECTION: Edit Profile ────────────────────────────────────────── */}
      {activeSection === 'info' && (
        <form onSubmit={saveProfile} className="space-y-6">
          {/* Avatar picker */}
          <div className="card p-6">
            <h2 className="text-base font-bold mb-1">Choose Avatar</h2>
            <p className="text-gray-500 text-xs mb-4">Pick a character that represents you</p>
            <div className="grid grid-cols-8 gap-2">
              {AVATARS.map(a => (
                <button type="button" key={a.emoji}
                  title={a.label}
                  onClick={() => setProfile(p => ({ ...p, avatar_emoji: a.emoji }))}
                  className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110
                    ${profile.avatar_emoji === a.emoji
                      ? 'bg-primary/30 border-2 border-primary ring-2 ring-primary/30 scale-110'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}>
                  {a.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Info fields */}
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-bold mb-2">Personal Information</h2>
            <Input
              label="Username"
              type="text"
              value={profile.username}
              onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
              placeholder="your_username"
              required
              hint="This is your public display name."
            />
            <Input
              label="Email address"
              type="email"
              value={profile.email}
              disabled
              hint="Email cannot be changed. Contact support if needed."
            />
          </div>

          <button type="submit" disabled={profSaving}
            className="btn-primary w-full py-3 font-semibold text-sm disabled:opacity-50">
            {profSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      )}

      {/* ── SECTION: Change Password ─────────────────────────────────────── */}
      {activeSection === 'password' && (
        <form onSubmit={changePassword}>
          <div className="card p-6 space-y-4 mb-5">
            <h2 className="text-base font-bold mb-2">Change Password</h2>
            <Input
              label="Current Password"
              type="password"
              value={pwForm.current}
              onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
              placeholder="Enter your current password"
              required
              autoComplete="current-password"
            />
            <Input
              label="New Password"
              type="password"
              value={pwForm.newPw}
              onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder="Re-enter new password"
              required
              autoComplete="new-password"
            />

            {/* Password strength bar */}
            {pwForm.newPw && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Password strength</p>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500
                      ${pwForm.newPw.length >= 10 ? 'bg-green-500 w-full'
                        : pwForm.newPw.length >= 7  ? 'bg-yellow-500 w-2/3'
                        : 'bg-red-500 w-1/3'}`} />
                </div>
                <p className={`text-[10px] mt-1
                  ${pwForm.newPw.length >= 10 ? 'text-green-400'
                    : pwForm.newPw.length >= 7  ? 'text-yellow-400'
                    : 'text-red-400'}`}>
                  {pwForm.newPw.length >= 10 ? 'Strong' : pwForm.newPw.length >= 7 ? 'Medium' : 'Weak'}
                </p>
              </div>
            )}
          </div>

          {/* Security tips */}
          <div className="rounded-xl bg-blue-900/20 border border-blue-700/30 p-4 mb-5">
            <p className="text-xs text-blue-300 font-medium mb-2">💡 Tips for a strong password</p>
            <ul className="text-[11px] text-blue-400/80 space-y-1 list-disc list-inside">
              <li>Use at least 10 characters</li>
              <li>Mix letters, numbers, and symbols</li>
              <li>Avoid using your name or email</li>
            </ul>
          </div>

          <button type="submit" disabled={pwSaving}
            className="btn-primary w-full py-3 font-semibold text-sm disabled:opacity-50">
            {pwSaving ? 'Changing Password…' : 'Change Password'}
          </button>
        </form>
      )}

      {/* ── SECTION: Account Info ────────────────────────────────────────── */}
      {activeSection === 'account' && (
        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="text-base font-bold mb-5">Account Details</h2>
            <dl className="space-y-4">
              {[
                { label: 'Username',      value: user?.username                                                                },
                { label: 'Email',         value: user?.email                                                                   },
                { label: 'Avatar',        value: `${user?.avatar_emoji || '😊'} (${AVATARS.find(a => a.emoji === user?.avatar_emoji)?.label || 'custom'})` },
                { label: 'Member since',  value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { dateStyle: 'long' }) : '—' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <dt className="text-sm text-gray-400">{r.label}</dt>
                  <dd className="text-sm font-medium">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Danger zone */}
          <div className="card p-6 border border-red-900/40">
            <h2 className="text-base font-bold text-red-400 mb-1">⚠️ Danger Zone</h2>
            <p className="text-gray-500 text-xs mb-4">These actions are irreversible. Proceed with caution.</p>
            <button
              onClick={() => { if (window.confirm('Are you sure you want to sign out?')) { /* logout handled in sidebar */ } }}
              className="text-sm text-red-400 hover:text-red-300 border border-red-700/40 hover:bg-red-900/20 rounded-lg px-4 py-2 transition-colors">
              Sign Out All Devices
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
