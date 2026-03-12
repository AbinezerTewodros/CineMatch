import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const TMDB_W500 = 'https://image.tmdb.org/t/p/w500'
const TMDB_ORIG = 'https://image.tmdb.org/t/p/original'

const FEATURES = [
  { icon: '🤖', title: 'AI Movie Guide',        desc: 'Chat with CineAI — ask for recs, discover directors, find hidden gems.' },
  { icon: '🎯', title: 'Smart Recommendations', desc: 'Our engine learns your taste from ratings and preferences.'            },
  { icon: '🌍', title: '1,400+ Titles',          desc: 'Movies, TV, anime, and docs — all searchable with live TMDB data.'    },
]

// ─── Compact Login form ───────────────────────────────────────────────────────
function LoginForm({ onClose, onSwitch }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const { login, loading }      = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    const r = await login(username, password)
    if (r.success) { onClose(); navigate('/discover') }
    else setError(r.error)
  }
  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
      <p className="text-gray-500 text-sm mb-6">Sign in to your CineMatch account</p>
      {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Username</label>
          <input type="text" required placeholder="your_username" value={username}
            onChange={e => setUsername(e.target.value)} className="input" autoFocus autoComplete="username" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Password</label>
          <input type="password" required placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)} className="input" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full mt-2 disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p className="text-center text-gray-500 text-sm mt-6">
        Don't have an account?{' '}
        <button onClick={onSwitch} className="text-primary hover:underline font-medium">Create one</button>
      </p>
    </div>
  )
}

// ─── Compact Register form ────────────────────────────────────────────────────
function RegisterForm({ onClose, onSwitch }) {
  const [form, setForm]       = useState({ email: '', username: '', password: '', confirm: '' })
  const [error, setError]     = useState('')
  const { register, loading } = useAuth()
  const navigate              = useNavigate()
  const chg = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (form.password !== form.confirm) return setError('Passwords do not match')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    const r = await register(form.email, form.password, form.username)
    if (r.success) { onClose(); navigate('/discover') }
    else setError(r.error)
  }
  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold mb-1">Create account</h2>
      <p className="text-gray-500 text-sm mb-5">Your personal AI movie guide awaits</p>
      {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { label: 'Email',            name: 'email',    type: 'email',    placeholder: 'you@example.com' },
          { label: 'Username',         name: 'username', type: 'text',     placeholder: 'cinelover42'     },
          { label: 'Password',         name: 'password', type: 'password', placeholder: 'At least 6 chars'},
          { label: 'Confirm Password', name: 'confirm',  type: 'password', placeholder: '••••••••'        },
        ].map(f => (
          <div key={f.name}>
            <label className="block text-sm text-gray-400 mb-1.5">{f.label}</label>
            <input {...f} value={form[f.name]} onChange={chg} className="input"
              required autoFocus={f.name === 'email'} />
          </div>
        ))}
        <button type="submit" disabled={loading} className="btn-primary w-full mt-1 disabled:opacity-50">
          {loading ? 'Creating account...' : 'Get Started Free'}
        </button>
      </form>
      <p className="text-center text-gray-500 text-sm mt-5">
        Already have an account?{' '}
        <button onClick={onSwitch} className="text-primary hover:underline font-medium">Sign in</button>
      </p>
    </div>
  )
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal({ mode, onClose }) {
  const [current, setCurrent] = useState(mode)
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Back / close button */}
        <button onClick={onClose}
          className="absolute -top-12 left-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20
            backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 group"
          title="Back to CineMatch">
          <svg className="w-5 h-5 text-white group-hover:-translate-x-0.5 transition-transform"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center mb-5">
          <h1 className="text-3xl font-black text-gradient">CineMatch</h1>
          <p className="text-gray-500 text-xs mt-0.5">AI Movie Guide</p>
        </div>

        {current === 'login'
          ? <LoginForm    onClose={onClose} onSwitch={() => setCurrent('register')} />
          : <RegisterForm onClose={onClose} onSwitch={() => setCurrent('login')} />}
      </div>
    </div>
  )
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [trending, setTrending]   = useState([])
  const [heroIndex, setHeroIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState(null)  // for crossfade
  const [fading, setFading]       = useState(false)
  const [authModal, setAuthModal] = useState(null)
  const heroTimer                 = useRef(null)
  const HERO_ITEMS                = 8

  useEffect(() => {
    api.get('/recommendations/trending?limit=20')
      .then(r => {
        const data = r.data
        setTrending(Array.isArray(data) ? data : data?.results || data?.movies || [])
      })
      .catch(console.error)
  }, [])

  // Navigate hero with smooth crossfade
  const goToHero = useCallback((next) => {
    setPrevIndex(heroIndex)
    setFading(true)
    setTimeout(() => {
      setHeroIndex(next)
      setFading(false)
      setPrevIndex(null)
    }, 600)
  }, [heroIndex])

  const prevHero = () => { clearInterval(heroTimer.current); goToHero((heroIndex - 1 + HERO_ITEMS) % HERO_ITEMS) }
  const nextHero = () => { clearInterval(heroTimer.current); goToHero((heroIndex + 1) % HERO_ITEMS) }

  useEffect(() => {
    if (!trending.length) return
    heroTimer.current = setInterval(() => {
      setHeroIndex(prev => {
        const next = (prev + 1) % Math.min(trending.length, HERO_ITEMS)
        setPrevIndex(prev)
        setFading(true)
        setTimeout(() => { setFading(false); setPrevIndex(null) }, 600)
        return next
      })
    }, 6000)
    return () => clearInterval(heroTimer.current)
  }, [trending])

  const hero = trending[heroIndex]
  const prev = prevIndex !== null ? trending[prevIndex] : null

  // Trending grid — all items in a responsive grid, no carousel
  const gridItems = trending.slice(0, 18)

  return (
    <div className="min-h-screen bg-dark-100 text-white overflow-x-hidden">
      {authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} />}

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/95 via-black/70 to-transparent backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-xl sm:text-2xl font-black text-gradient whitespace-nowrap">CineMatch</span>
            <span className="text-gray-500 text-[11px] sm:text-xs truncate">AI Movie Guide</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setAuthModal('login')}
              className="text-gray-300 hover:text-white text-xs sm:text-sm transition-colors px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-white/10"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthModal('register')}
              className="btn-primary text-xs sm:text-sm py-2 px-4 sm:px-5"
            >
              Get Started
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero: full-screen crossfade carousel ──────────────────────────── */}
      <section className="relative min-h-[100vh] flex items-center overflow-hidden pt-16 sm:pt-20">

        {/* Previous backdrop (fades out) */}
        {prev?.backdrop_path && (
          <img src={`${TMDB_ORIG}${prev.backdrop_path}`} alt="" aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: fading ? 0 : 0, transition: 'opacity 0.6s ease-in-out' }} />
        )}

        {/* Current backdrop */}
        {hero?.backdrop_path && (
          <img src={`${TMDB_ORIG}${hero.backdrop_path}`} alt="" aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.6s ease-in-out' }} />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-100 via-dark-100/60 to-dark-100/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-100/90 via-dark-100/40 to-transparent" />

        {/* Hero text — fades with backdrop */}
        <div className="relative z-10 max-w-3xl px-4 sm:px-6 md:px-16"
          style={{ opacity: fading ? 0.4 : 1, transition: 'opacity 0.5s ease-in-out' }}>
          <div className="badge bg-primary/30 text-primary border border-primary/40 mb-5 text-sm px-4 py-1.5 w-fit">
            🎬 AI-Powered Movie Recommendations
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.07] mb-6 tracking-tight">
            Your next
            <br className="hidden sm:block" />
            <span className="text-gradient">favourite film</span>
            <br className="hidden sm:block" />
            is one click away.
          </h1>
          <p className="text-gray-300 text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-xl leading-relaxed">
            Discover movies, TV shows and anime tailored to your taste. Chat with our AI, rate what you've watched, and let the algorithm do the rest.
          </p>
          <div className="flex gap-3 sm:gap-4 flex-wrap">
            <button onClick={() => setAuthModal('register')} className="btn-primary text-sm sm:text-base px-6 sm:px-8 py-3.5 shadow-lg shadow-primary/30">
              Start for Free →
            </button>
            <button onClick={() => setAuthModal('login')} className="btn-ghost text-sm sm:text-base px-6 sm:px-8 py-3.5">
              Sign In
            </button>
          </div>
        </div>

        {/* Prev / Next arrows */}
        {trending.length > 1 && (
          <>
            <button onClick={prevHero}
              className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20
                w-11 h-11 rounded-full bg-black/50 hover:bg-primary/70 backdrop-blur-sm
                items-center justify-center transition-all duration-200 hover:scale-110">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={nextHero}
              className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20
                w-11 h-11 rounded-full bg-black/50 hover:bg-primary/70 backdrop-blur-sm
                items-center justify-center transition-all duration-200 hover:scale-110">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Dot navigation */}
        {trending.length > 1 && (
          <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2 items-center">
            {trending.slice(0, HERO_ITEMS).map((_, i) => (
              <button key={i}
                onClick={() => { clearInterval(heroTimer.current); goToHero(i) }}
                className="group flex items-center">
                <div className={`rounded-full transition-all duration-500
                  ${i === heroIndex
                    ? 'bg-primary w-7 h-2.5 shadow-lg shadow-primary/40'
                    : 'bg-white/40 w-2.5 h-2.5 group-hover:bg-white/70'}`} />
              </button>
            ))}
          </div>
        )}

        {/* Currently trending chip */}
        {hero?.poster_path && (
          <div className="absolute bottom-6 right-4 sm:bottom-8 sm:right-8 z-20 glass rounded-2xl p-3 max-w-[13rem]
            border border-white/10 shadow-xl"
            style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.5s ease-in-out' }}>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">Now Trending</p>
            <div className="flex items-center gap-2.5">
              <img src={`${TMDB_W500}${hero.poster_path}`} alt={hero.title}
                className="w-11 h-15 object-cover rounded-lg shrink-0 shadow-md" />
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight line-clamp-2">{hero.title}</p>
                <p className="text-[11px] text-green-400 mt-1 font-semibold">
                  ★ {hero.vote_average?.toFixed(1)}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {hero.release_date ? new Date(hero.release_date).getFullYear() : ''}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Trending Grid ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-14 -mt-10 sm:-mt-16 relative z-10">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-primary rounded-full" />
          Trending Right Now
        </h2>
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {gridItems.map(m => (
            <button key={m.id} onClick={() => setAuthModal('register')}
              className="group text-left cursor-pointer">
              <div className="relative rounded-xl overflow-hidden aspect-[2/3] mb-1.5
                transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/20">
                <img
                  src={m.poster_path
                    ? `${TMDB_W500}${m.poster_path}`
                    : `https://placehold.co/200x300/1a1a2e/444?text=${encodeURIComponent(m.title?.slice(0,10) ?? '')}`}
                  alt={m.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Rating badge */}
                <div className="absolute top-1.5 right-1.5 badge bg-black/70 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5">
                  ★ {m.vote_average?.toFixed(1)}
                </div>
                {/* CTA on hover */}
                <div className="absolute bottom-0 left-0 right-0 p-2 text-center
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-[10px] bg-primary/90 text-white rounded-full px-2 py-0.5 font-medium">
                    Sign up to explore →
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 font-medium line-clamp-1 group-hover:text-white transition-colors px-0.5">
                {m.title}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-2">Everything you need to find your next watch</h2>
          <p className="text-gray-500 text-center mb-10 sm:mb-12 text-sm">Powered by TMDB data and OpenRouter AI</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
        <div className="max-w-xl mx-auto glass rounded-3xl p-8 sm:p-10 lg:p-12 border border-white/10">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Ready to start watching smarter?</h2>
          <p className="text-gray-400 mb-7 sm:mb-8 text-sm">Free forever. No credit card required.</p>
          <button onClick={() => setAuthModal('register')} className="btn-primary text-sm sm:text-base px-8 sm:px-10 py-3 shadow-lg shadow-primary/30">
            Create Your Account →
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-gray-600 text-[11px] sm:text-xs">
        <span className="font-black text-gradient text-sm">CineMatch</span>
        <span className="text-center sm:text-left">Powered by TMDB · OpenRouter · Supabase</span>
        <div className="flex gap-3 sm:gap-4">
          <button onClick={() => setAuthModal('login')} className="hover:text-gray-300 transition-colors">Sign In</button>
          <button onClick={() => setAuthModal('register')} className="hover:text-gray-300 transition-colors">Register</button>
        </div>
      </footer>
    </div>
  )
}
