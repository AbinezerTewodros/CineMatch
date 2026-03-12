import { useState, useEffect } from 'react'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'
import OnboardingModal from '../components/OnboardingModal'

const TMDB_W500 = 'https://image.tmdb.org/t/p/w500'

const MEDIA_TABS = [
  { id: null,    label: '🌐 For You'  },
  { id: 'movie', label: '🎬 Movies'  },
  { id: 'tv',    label: '📺 TV Shows'},
]

const SkeletonCard  = () => <div className="skeleton aspect-[2/3] rounded-xl animate-pulse" />

// ── "Because" badge ──────────────────────────────────────────────────────────
function BecauseBadge({ reason }) {
  if (!reason) return null
  return (
    <div className="mt-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] text-primary leading-tight line-clamp-2">
      ✨ {reason}
    </div>
  )
}

// ── Taste profile radar bars ─────────────────────────────────────────────────
function TasteBar({ name, score }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-0.5">
        <span className="text-gray-400">{name}</span>
        <span className="text-gray-600">{Math.round(score * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/8">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-700"
          style={{ width: `${score * 100}%` }} />
      </div>
    </div>
  )
}

export default function RecommendationsPage() {
  const [recs, setRecs]              = useState([])
  const [loading, setLoading]        = useState(true)
  const [activeTab, setActiveTab]    = useState(null)
  const [metadata, setMetadata]      = useState(null)
  const [tasteProfile, setTaste]     = useState(null)
  const [showOnboarding, setOnboarding] = useState(false)
  const [isColdStart, setIsColdStart]   = useState(false)
  const [migrationNeeded, setMigration] = useState(false)

  // Check onboarding status on mount
  useEffect(() => {
    api.get('/onboarding/status')
      .then(r => {
        if (!r.data.completed) setOnboarding(true)
      })
      .catch(console.error)
  }, [])

  // Fetch recs + taste profile
  const loadRecs = async (type) => {
    setLoading(true)
    try {
      const [recRes, profileRes] = await Promise.all([
        api.get(`/ai/recommendations${type ? `?type=${type}` : ''}`),
        api.get('/ai/taste-profile').catch(() => ({ data: null })),
      ])

      const data = recRes.data
      setRecs(data.recommendations || [])
      setMetadata(data.metadata || null)
      setIsColdStart(!!data.metadata?.cold_start)
      setMigration(!!data.metadata?.migration_needed)
      setTaste(profileRes.data)
    } catch (err) {
      console.error('AI recs error:', err)
      // Last-resort fallback — add generic because so badges still show
      try {
        const fallback = await api.get('/recommendations')
        setRecs((fallback.data || []).map(m => ({ ...m, because: 'Popular pick for you' })))
      } catch (_) {}
    } finally { setLoading(false) }
  }

  useEffect(() => { loadRecs(activeTab) }, [activeTab])

  const addToWatchlist = async (movieId) => {
    try { await api.post('/watchlist', { movieId }) }
    catch (err) { console.error(err) }
  }

  const onOnboardingComplete = () => {
    setOnboarding(false)
    loadRecs(activeTab)
  }

  const topGenres = tasteProfile?.genres?.slice(0, 5) || []

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Onboarding modal */}
      {showOnboarding && <OnboardingModal onComplete={onOnboardingComplete} />}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-black flex items-center gap-2">
            ✨ For You
            {metadata?.model && (
              <span className="text-[10px] text-gray-600 font-normal bg-white/5 border border-white/8 rounded px-1.5 py-0.5 ml-1">
                AI
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {isColdStart
              ? 'Rate some movies to get personalised recommendations!'
              : `Personalised based on your ${metadata?.ratings_count || 0} ratings`}
          </p>
        </div>

        {/* Refresh cache button */}
        <button onClick={() => loadRecs(activeTab)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300
            bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-all">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="flex gap-6">
        {/* ── Main content ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Media type tabs */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
            {MEDIA_TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Migration needed notice */}
          {migrationNeeded && !loading && (
            <div className="mb-5 p-4 bg-orange-900/20 border border-orange-700/30 rounded-xl flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-orange-300">DB Migration Required</p>
                <p className="text-xs text-orange-400/80 mt-0.5">
                  Run <code className="bg-black/30 px-1 rounded">backend/src/scripts/ai_migration.sql</code> in
                  your Supabase SQL editor to enable full AI recommendations.
                </p>
              </div>
            </div>
          )}

          {/* Cold start notice */}
          {isColdStart && !migrationNeeded && !loading && (
            <div className="mb-5 p-4 bg-blue-900/20 border border-blue-700/30 rounded-xl flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="text-sm font-semibold text-blue-300">Help us learn your taste</p>
                <p className="text-xs text-blue-400/80 mt-0.5">
                  Rate movies on their detail pages (★ stars) or re-run the onboarding quiz to get fully personalised recommendations.
                </p>
                <button onClick={() => setOnboarding(true)}
                  className="mt-2 text-xs text-primary hover:underline">
                  → Run taste questionnaire
                </button>
              </div>
            </div>
          )}

          {/* Movie grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : recs.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-4xl mb-3">🎬</p>
              <p>No recommendations yet. Rate a few movies to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {recs.map(movie => (
                <div key={movie.id}>
                  <MovieCard movie={movie} onWatchlist={addToWatchlist} />
                  <BecauseBadge reason={movie.because} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Taste Profile Sidebar ───────────────────────────────────────── */}
        {topGenres.length > 0 && (
          <aside className="w-48 shrink-0 hidden lg:block">
            <div className="card p-4 sticky top-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Taste</h3>
              <div className="space-y-3">
                {topGenres.map(g => (
                  <TasteBar key={g.id} name={g.name} score={g.score} />
                ))}
              </div>

              {tasteProfile?.avg_rating && (
                <div className="border-t border-white/8 mt-4 pt-3">
                  <p className="text-[11px] text-gray-500">Avg rating you give</p>
                  <p className="text-lg font-black text-yellow-400">★ {tasteProfile.avg_rating?.toFixed(1)}</p>
                </div>
              )}

              <button onClick={() => setOnboarding(true)}
                className="w-full mt-4 text-[10px] text-gray-600 hover:text-gray-400 border border-white/8
                  hover:bg-white/5 rounded-lg py-1.5 transition-all">
                ↺ Re-run Quiz
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
