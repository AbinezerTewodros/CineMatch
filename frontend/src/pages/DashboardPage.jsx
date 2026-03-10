import { useState, useEffect } from 'react'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'

const TMDB_W500 = 'https://image.tmdb.org/t/p/w500'

export default function DashboardPage() {
  const [watchlist, setWatchlist] = useState([])
  const [ratings, setRatings]     = useState([])
  const [prefs, setPrefs]         = useState({ preferred_genres: [], min_rating: 6.0 })
  const [genres, setGenres]       = useState([])   // ← dynamic from API
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('watchlist')
  const [saveMsg, setSaveMsg]     = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [wlRes, ratRes, prefRes, genreRes] = await Promise.all([
          api.get('/watchlist'),
          api.get('/ratings/me'),
          api.get('/preferences'),
          api.get('/genres'),
        ])
        setWatchlist(wlRes.data)
        setRatings(ratRes.data)
        setPrefs(prefRes.data || { preferred_genres: [], min_rating: 6.0 })
        setGenres(genreRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const removeFromWatchlist = async (movieId) => {
    try {
      await api.delete(`/watchlist/${movieId}`)
      setWatchlist(prev => prev.filter(m => m.id !== movieId))
    } catch (err) { console.error(err) }
  }

  const toggleGenre = (genreId) => {
    setPrefs(prev => ({
      ...prev,
      preferred_genres: (prev.preferred_genres || []).includes(genreId)
        ? prev.preferred_genres.filter(g => g !== genreId)
        : [...(prev.preferred_genres || []), genreId]
    }))
  }

  const savePreferences = async () => {
    try {
      await api.put('/preferences', prefs)
      setSaveMsg('Preferences saved ✓')
      setTimeout(() => setSaveMsg(''), 2500)
    } catch (err) { console.error(err) }
  }

  const tabs = [
    { id: 'watchlist', label: `🎬 Watchlist (${watchlist.length})` },
    { id: 'ratings',   label: `⭐ Rated (${ratings.length})` },
    { id: 'prefs',     label: '⚙️ Preferences' },
  ]

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <h1 className="text-2xl font-black mb-6">My Library</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-8 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[2/3] rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Watchlist ───────────────────────────────────────────────── */}
          {activeTab === 'watchlist' && (
            watchlist.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-4xl mb-3">🎬</p>
                <p>Your watchlist is empty. Browse movies and TV shows to add some!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {watchlist.map(m => (
                  <MovieCard key={m.id} movie={m} onWatchlist={removeFromWatchlist} mode="remove" />
                ))}
                ))}
              </div>
            )
          )}

          {/* ── Ratings ─────────────────────────────────────────────────── */}
          {activeTab === 'ratings' && (
            ratings.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-4xl mb-3">⭐</p>
                <p>You haven't rated anything yet. Open a movie or show to rate it!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ratings.map(r => (
                  <div key={r.movie_id} className="card flex items-center gap-4 p-4">
                    {r.poster_path ? (
                      <img src={`${TMDB_W500}${r.poster_path}`} alt={r.title}
                        className="w-12 h-16 object-cover rounded-lg shrink-0" />
                    ) : (
                      <div className="w-12 h-16 bg-white/10 rounded-lg shrink-0 flex items-center justify-center text-gray-600 text-xs">N/A</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{r.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {r.media_type === 'tv' ? '📺 TV Show' : '🎬 Movie'} ·{' '}
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <div className="text-yellow-400 text-sm shrink-0">
                      {'★'.repeat(Math.round(r.rating / 2))}
                      <span className="text-gray-600">{'★'.repeat(5 - Math.round(r.rating / 2))}</span>
                    </div>
                    <span className="badge bg-yellow-500/20 text-yellow-400 font-bold shrink-0">{r.rating}/10</span>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Preferences ─────────────────────────────────────────────── */}
          {activeTab === 'prefs' && (
            <div className="card p-6 max-w-2xl">
              <h2 className="font-bold mb-1">Genre Preferences</h2>
              <p className="text-gray-500 text-xs mb-4">Select genres to improve your recommendations. Loaded from your database.</p>

              {genres.length === 0 ? (
                <div className="skeleton h-24 rounded-lg mb-6" />
              ) : (
                <div className="flex flex-wrap gap-2 mb-6">
                  {genres.map(g => (
                    <button
                      key={g.id}
                      onClick={() => toggleGenre(g.id)}
                      className={`badge cursor-pointer transition-all ${
                        (prefs.preferred_genres || []).includes(g.id)
                          ? 'bg-primary text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">
                  Minimum Rating:{' '}
                  <span className="text-white font-bold">{Number(prefs.min_rating || 6).toFixed(1)}</span>
                </label>
                <input
                  type="range" min="0" max="10" step="0.5"
                  value={prefs.min_rating || 6}
                  onChange={e => setPrefs(p => ({ ...p, min_rating: parseFloat(e.target.value) }))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0 — Show everything</span>
                  <span>10 — Masterpieces only</span>
                </div>
              </div>

              <button onClick={savePreferences} className="btn-primary w-full">
                Save Preferences
              </button>
              {saveMsg && (
                <p className="text-green-400 text-sm text-center mt-3">{saveMsg}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
