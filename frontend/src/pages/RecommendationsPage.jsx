import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'
import { useAuth } from '../contexts/AuthContext'

const MEDIA_TABS = [
  { id: 'all',   label: '🌐 All'      },
  { id: 'movie', label: '🎬 Movies'   },
  { id: 'tv',    label: '📺 TV Shows' },
  { id: 'anime', label: '🎌 Anime'    },
]

const SkeletonCard = () => <div className="skeleton aspect-[2/3] rounded-xl" />

export default function RecommendationsPage() {
  const { user } = useAuth()
  const [recs, setRecs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [hasPrefs, setHasPrefs] = useState(false)
  const [mediaType, setMediaType] = useState('all')

  const load = async (type) => {
    setLoading(true)
    try {
      const typeParam = type !== 'all' ? `?type=${type}` : ''
      const [recsRes, prefRes] = await Promise.all([
        api.get(`/recommendations${typeParam}`),
        api.get('/preferences'),
      ])
      setRecs(recsRes.data || [])

      const p = prefRes.data
      setHasPrefs(
        (p?.preferred_genres && p.preferred_genres.length > 0) ||
        (p?.min_rating && p.min_rating !== 6.0)
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(mediaType) }, [mediaType])

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black">For You</h1>
          <p className="text-gray-500 text-sm mt-1">
            {hasPrefs
              ? 'Personalized picks based on your ratings & preferences'
              : 'Set your preferences to get truly personalized picks'}
          </p>
        </div>
        {!hasPrefs && (
          <Link to="/dashboard" className="btn-primary text-sm py-2 px-4 shrink-0">
            ⚙️ Set Preferences
          </Link>
        )}
      </div>

      {/* Media type tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-5 w-fit">
        {MEDIA_TABS.map(tab => (
          <button key={tab.id} onClick={() => setMediaType(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${mediaType === tab.id ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!loading && !hasPrefs && recs.length === 0 && (
        <div className="text-center py-24 max-w-md mx-auto">
          <div className="text-6xl mb-5">🎯</div>
          <h2 className="text-xl font-bold mb-3">Help us learn your taste</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            Rate movies or set genre preferences so we can build a personalized list just for you.
          </p>
          <div className="flex flex-col gap-3 items-center">
            <Link to="/discover" className="btn-primary w-48 text-center">🎬 Browse & Rate</Link>
            <Link to="/dashboard" className="btn-ghost w-48 text-center text-sm">⚙️ Set Preferences</Link>
          </div>
        </div>
      )}

      {/* No results for type filter */}
      {!loading && recs.length === 0 && hasPrefs && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🔍</p>
          <p>No {MEDIA_TABS.find(t => t.id === mediaType)?.label ?? ''} recommendations yet.</p>
          <button onClick={() => setMediaType('all')} className="btn-ghost mt-4 text-sm">Clear filter</button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Recommendations grid */}
      {!loading && recs.length > 0 && (
        <>
          {!hasPrefs && (
            <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg text-yellow-300 text-sm flex items-center gap-2">
              <span>💡</span>
              <span>Showing popular picks. <Link to="/dashboard" className="underline hover:text-yellow-200">Set preferences</Link> for truly personalized results.</span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recs.map(m => <MovieCard key={m.id} movie={m} />)}
          </div>
        </>
      )}
    </div>
  )
}
