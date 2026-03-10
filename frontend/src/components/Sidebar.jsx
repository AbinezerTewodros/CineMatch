import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ForYouIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)

const LibraryIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
  </svg>
)

const PrefsIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  </svg>
)

const ChevronDown = ({ open }) => (
  <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const navItems = [
  { to: '/recommendations', label: 'For You',    icon: <ForYouIcon /> },
  { to: '/dashboard',       label: 'My Library', icon: <LibraryIcon /> },
]

export default function Sidebar({ collapsed, onToggle }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, logout }              = useAuth()
  const navigate                      = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <aside
      className={`shrink-0 glass border-r border-white/5 flex flex-col h-screen sticky top-0
        transition-all duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'w-[60px]' : 'w-52'}`}
      style={{ padding: collapsed ? '24px 8px' : '24px 12px' }}
    >
      {/* Brand row */}
      <div className={`flex items-center mb-8 min-h-[32px] ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
        {/* Logo initial (collapsed) or expand button */}
        {collapsed ? (
          <button onClick={onToggle} title="Expand"
            className="text-xl font-black text-gradient hover:opacity-80 transition-opacity">
            C
          </button>
        ) : (
          <>
            <button onClick={() => navigate('/discover')}
              className="text-xl font-black text-gradient hover:opacity-80 transition-opacity">
              CineMatch
            </button>
            <button onClick={onToggle} title="Collapse"
              className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `nav-link flex items-center gap-3 w-full
               ${isActive ? 'active' : ''}
               ${collapsed ? 'justify-center !px-0' : ''}`
            }>
            {icon}
            {!collapsed && <span className="truncate text-sm">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Profile collapsible section */}
      <div className="border-t border-white/5 pt-3 mt-2">
        {/* Profile toggle button */}
        <button
          onClick={() => { if (!collapsed) setProfileOpen(o => !o); else navigate('/profile') }}
          title={collapsed ? 'Profile' : undefined}
          className={`flex items-center w-full rounded-xl px-2 py-2.5 transition-all hover:bg-white/10 gap-2.5
            ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-purple-700/60
              border border-primary/40 flex items-center justify-center text-lg shrink-0">
              {user?.avatar_emoji || '😊'}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{user?.username}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          {!collapsed && <ChevronDown open={profileOpen} />}
        </button>

        {/* Profile sub-menu (slides open) */}
        {!collapsed && profileOpen && (
          <div className="mt-1 space-y-0.5 animate-fade-in pl-2">
            <button onClick={() => navigate('/profile?section=info')}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              <span>✏️</span> Edit Profile
            </button>
            <button onClick={() => navigate('/profile?section=password')}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              <span>🔐</span> Change Password
            </button>
            <button onClick={handleLogout}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">
              <span>🚪</span> Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
