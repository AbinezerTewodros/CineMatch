import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

const ChevronDown = ({ open = false }) => (
  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

// ── Solid dark panel used for every dropdown ──────────────────────────────────
const Panel = ({ children, className = '' }) => (
  <div className={`absolute bg-[#0d0d18] border border-white/15 rounded-xl shadow-2xl z-[80] ${className}`}>
    {children}
  </div>
)

export default function Navbar() {
  const [query, setQuery]             = useState('')
  const [genres, setGenres]           = useState([])
  const [genreHover, setGenreHover]   = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)
  const { user, logout }              = useAuth()
  const navigate                      = useNavigate()
  const location                      = useLocation()

  const genreTimer  = useRef(null)
  const menuTimer   = useRef(null)
  const profileRef  = useRef(null)
  const menuRef     = useRef(null)

  // URL params for active state
  const params     = new URLSearchParams(location.search)
  const activeType  = params.get('type')    // 'movie' | 'tv'
  const activeGenreId = Number(params.get('genreId') || 0)
  const activeSort  = params.get('sort')

  useEffect(() => {
    api.get('/genres').then(r => setGenres(r.data)).catch(console.error)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const close = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (menuRef.current    && !menuRef.current.contains(e.target))    setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/discover?search=${encodeURIComponent(query.trim())}`)
  }

  const navTo = (param) => {
    // Clear search when navigating via quick links
    navigate(`/discover${param}`)
    setMenuOpen(false)
  }

  const isNavActive = (param) =>
    location.pathname === '/discover' && location.search === param

  // Genre hover — small delay so cursor can reach dropdown
  const onGenreEnter = () => { clearTimeout(genreTimer.current); setGenreHover(true) }
  const onGenreLeave = () => { genreTimer.current = setTimeout(() => setGenreHover(false), 200) }

  // Menu (hamburger) hover
  const onMenuEnter = () => { clearTimeout(menuTimer.current); setMenuOpen(true) }
  const onMenuLeave = () => { menuTimer.current = setTimeout(() => setMenuOpen(false), 200) }

  const handleLogout = () => { setProfileOpen(false); logout(); navigate('/') }

  const navLinkCls = (active) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
    ${active ? 'bg-primary/80 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`

  return (
    <header className="bg-[#0d0d18]/95 backdrop-blur-md border-b border-white/8 h-auto min-h-[56px] flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4 shrink-0 z-40 relative">

      {/* ── Hamburger menu (hover dropdown) ─────────────────────────────── */}
      <div className="relative shrink-0" ref={menuRef}
        onMouseEnter={onMenuEnter} onMouseLeave={onMenuLeave}>
        <button
          className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
          type="button"
          onClick={() => {
            clearTimeout(menuTimer.current)
            setMenuOpen(open => !open)
          }}
          aria-label="Open main menu"
          aria-expanded={menuOpen}>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {menuOpen && (
          <Panel className="left-0 top-full mt-1 w-52 py-2 animate-fade-in">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest px-4 pt-1 pb-1.5">Menu</p>
            {[
              { label: '⭐ For You',    to: '/recommendations' },
              { label: '📚 My Library', to: '/dashboard'       },
            ].map(item => (
              <button key={item.to} onClick={() => { navigate(item.to); setMenuOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-colors">
                {item.label}
              </button>
            ))}
            <div className="border-t border-white/8 mt-1 pt-1">
              <button onClick={() => { navigate('/profile'); setMenuOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-colors">
                👤 Profile
              </button>
            </div>
          </Panel>
        )}
      </div>

      {/* Logo */}
      <Link to="/discover"
        className="text-lg sm:text-xl font-black text-gradient shrink-0 mr-2 hover:opacity-80 transition-opacity">
        CineMatch
      </Link>

      {/* ── Nav links ───────────────────────────────────────────────────── */}
      <nav className="hidden md:flex items-center gap-0.5">

        {/* Genres — hover dropdown */}
        <div className="relative" onMouseEnter={onGenreEnter} onMouseLeave={onGenreLeave}>
          <button
            type="button"
            onClick={() => {
              clearTimeout(genreTimer.current)
              setGenreHover(open => !open)
            }}
            className={`flex items-center gap-1 ${navLinkCls(!!activeGenreId)}`}>
            {activeGenreId
              ? (genres.find(g => g.id === activeGenreId)?.name || 'Genre')
              : 'Genres'}
            <ChevronDown open={genreHover} />
          </button>

          {genreHover && (
            <Panel
              className="left-0 top-full mt-1 w-72 p-3 animate-fade-in"
              onMouseEnter={onGenreEnter} onMouseLeave={onGenreLeave}>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 px-1">Browse by Genre</p>
              <div className="grid grid-cols-2 gap-0.5 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
                {/* All Genres — first option */}
                <button
                  onClick={() => navTo(activeType ? `?type=${activeType}` : '')}
                  className={`col-span-2 text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${!activeGenreId
                      ? 'bg-primary/25 text-primary border border-primary/30'
                      : 'text-gray-400 hover:bg-white/8 hover:text-white'}`}>
                  ✦ All Genres
                </button>
                {genres.map(g => (
                  <button key={g.id}
                    onClick={() => navTo(`?${activeType ? `type=${activeType}&` : ''}genreId=${g.id}&genre=${encodeURIComponent(g.name)}`)}
                    className={`text-left px-3 py-2 rounded-lg text-xs transition-colors truncate
                      ${activeGenreId === g.id
                        ? 'bg-primary/25 text-primary font-semibold border border-primary/30'
                        : 'text-gray-300 hover:bg-white/8 hover:text-white'}`}>
                    {g.name}
                  </button>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Movies */}
        <button onClick={() => navTo('?type=movie')}
          className={navLinkCls(isNavActive('?type=movie') || (activeType === 'movie' && !activeGenreId))}>
          Movies
        </button>

        {/* TV Shows */}
        <button onClick={() => navTo('?type=tv')}
          className={navLinkCls(isNavActive('?type=tv') || (activeType === 'tv' && !activeGenreId))}>
          TV Shows
        </button>

        {/* Top IMDb */}
        <button onClick={() => navTo('?sort=top_rated')}
          className={navLinkCls(isNavActive('?sort=top_rated'))}>
          Top IMDb
        </button>
      </nav>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-2 sm:mx-auto w-full sm:w-auto">
        <div className="relative group">
          {/* Search icon */}
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors duration-200"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search movies, shows, people…"
            className="w-full h-9 pl-10 pr-16 text-sm rounded-full
              bg-white/6 border border-white/10
              text-white placeholder-gray-500
              focus:outline-none focus:bg-white/10 focus:border-primary/50
              focus:shadow-[0_0_0_3px_rgba(229,9,20,0.12)]
              transition-all duration-200"
          />

          {/* Ctrl+K hint */}
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2
            text-[10px] text-gray-600 bg-white/6 border border-white/10
            rounded px-1.5 py-0.5 font-mono pointer-events-none
            group-focus-within:opacity-0 transition-opacity">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* ── Profile dropdown ────────────────────────────────────────────── */}
      <div className="relative shrink-0" ref={profileRef}>
        <button onClick={() => setProfileOpen(o => !o)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all border
            ${profileOpen ? 'bg-white/12 border-white/20' : 'hover:bg-white/8 border-transparent'}`}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-purple-700/60
            border border-primary/40 flex items-center justify-center text-base leading-none shrink-0">
            {user?.avatar_emoji || '😊'}
          </div>
          <span className="text-sm font-medium hidden lg:block max-w-[100px] truncate text-gray-200">
            {user?.username}
          </span>
          <ChevronDown open={profileOpen} />
        </button>

        {profileOpen && (
          <Panel className="right-0 top-full mt-2 w-56 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-4 py-3.5 bg-white/4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-purple-700/60
                  border border-primary/40 flex items-center justify-center text-xl shrink-0">
                  {user?.avatar_emoji || '😊'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate text-white">{user?.username}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="py-1.5">
              {[
                { icon: '✏️', label: 'Edit Profile',    action: () => navigate('/profile?section=info')     },
                { icon: '🔐', label: 'Change Password',  action: () => navigate('/profile?section=password') },
                { icon: '🎯', label: 'My Preferences',   action: () => navigate('/recommendations')          },
                { icon: '📚', label: 'My Library',       action: () => navigate('/dashboard')                },
                ...(user?.is_admin ? [{ icon: '🛡️', label: 'Admin Panel', action: () => navigate('/admin') }] : []),
              ].map(item => (
                <button key={item.label}
                  onClick={() => { item.action(); setProfileOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-colors text-left">
                  <span className="w-5 text-center shrink-0">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="border-t border-white/10 py-1.5">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left">
                <span className="w-5 text-center shrink-0">🚪</span> Sign Out
              </button>
            </div>
          </Panel>
        )}
      </div>
    </header>
  )
}
