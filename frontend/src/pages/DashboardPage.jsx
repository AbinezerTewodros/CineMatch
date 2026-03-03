import { useState, useEffect } from 'react'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'

const TMDB_W500 = 'https://image.tmdb.org/t/p/w500'

const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  18: 'Drama', 14: 'Fantasy', 27: 'Horror', 878: 'Sci-Fi', 10749: 'Romance',
  53: 'Thriller', 37: 'Western',
}

export default function DashboardPage() {
  const [watchlist, setWatchlist]   = useState([])
  const [ratings, setRatings]       = useState([])
  const [prefs, setPrefs]           = useState({ preferred_genres: [], min_rating: 6.0 })
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('watchlist')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [wlRes, ratRes, prefRes] = await Promise.all([
          api.get('/watchlist'),
          api.get('/ratings/me'),
          api.get('/preferences'),
        ])
        setWatchlist(wlRes.data)
        setRatings(ratRes.data)
        setPrefs(prefRes.data)
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
    } catch (err) {
      console.error(err)
    }
  }

  const toggleGenre = (genreId) => {
    setPrefs(prev => ({
      ...prev,
      preferred_genres: prev.preferred_genres.includes(genreId)
        ? prev.preferred_genres.filter(g => g !== genreId)
        : [...prev.preferred_genres, genreId]
    }))
  }

  const savePreferences = async () => {
    try {
      await api.put('/preferences', prefs)
    } catch (err) {
      console.error(err)
    }
  }

  const tabs = [
    { id: 'watchlist', label: `Watchlist (${watchlist.length})` },
    { id: 'ratings',   label: `Rated (${ratings.length})` },
    { id: 'prefs',     label: 'Preferences' },
  ]

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <h1 className="text-2xl font-black mb-6">My Library</h1>

      {/* Tabs */}
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
          {/* Watchlist tab */}
          {activeTab === 'watchlist' && (
            watchlist.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-4xl mb-3">🎬</p>
                <p>Your watchlist is empty. Add movies from the home page!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {watchlist.map(m => (
                  <MovieCard key={m.id} movie={m} onWatchlist={removeFromWatchlist} />
                ))}
              </div>
            )
          )}

          {/* Ratings tab */}
          {activeTab === 'ratings' && (
            ratings.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-4xl mb-3">⭐</p>
                <p>You haven't rated any movies yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ratings.map(r => (
                  <div key={r.movie_id} className="card flex items-center gap-4 p-4">
                    {r.poster_path && (
                      <img src={`${TMDB_W500}${r.poster_path}`} alt={r.title}
                        className="w-12 h-16 object-cover rounded-lg shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{r.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Rated on {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {'★'.repeat(Math.round(r.rating / 2))}{'☆'.repeat(5 - Math.round(r.rating / 2))}
                    </div>
                    <span className="badge bg-yellow-500/20 text-yellow-400 font-bold">{r.rating}/10</span>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Preferences tab */}
          {activeTab === 'prefs' && (
            <div className="card p-6 max-w-lg">
              <h2 className="font-bold mb-4">Genre Preferences</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {Object.entries(GENRE_MAP).map(([id, name]) => (
                  <button
                    key={id}
                    onClick={() => toggleGenre(Number(id))}
                    className={`badge cursor-pointer transition-all ${
                      prefs.preferred_genres?.includes(Number(id))
                        ? 'bg-primary text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">
                  Minimum Rating: <span className="text-white font-bold">{prefs.min_rating}</span>
                </label>
                <input
                  type="range" min="0" max="10" step="0.5"
                  value={prefs.min_rating}
                  onChange={e => setPrefs(p => ({ ...p, min_rating: parseFloat(e.target.value) }))}
                  className="w-full accent-primary"
                />
              </div>

              <button onClick={savePreferences} className="btn-primary w-full">
                Save Preferences
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
