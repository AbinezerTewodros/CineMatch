import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'

const SkeletonCard = () => <div className="skeleton aspect-[2/3] rounded-xl" />

export default function RecommendationsPage() {
  const [recs, setRecs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [hasPrefs, setHasPrefs] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [recsRes, prefRes] = await Promise.all([
          api.get('/recommendations'),
          api.get('/preferences'),
        ])
        setRecs(recsRes.data || [])

        // Determine if user has actually set preferences
        const p = prefRes.data
        const userHasPrefs =
          (p?.preferred_genres && p.preferred_genres.length > 0) ||
          (p?.min_rating && p.min_rating !== 6.0)
        setHasPrefs(userHasPrefs)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Recommended for You</h1>
          <p className="text-gray-500 text-sm mt-1">
            {hasPrefs
              ? 'Personalized picks based on your ratings and genre preferences'
              : 'Showing popular titles — set your preferences to personalize this page'}
          </p>
        </div>
        {!hasPrefs && (
          <Link to="/dashboard?tab=prefs" className="btn-primary text-sm py-2 px-4 shrink-0">
            ⚙️ Set Preferences
          </Link>
        )}
      </div>

      {/* Empty/no-prefs state */}
      {!loading && !hasPrefs && recs.length === 0 && (
        <div className="text-center py-24 max-w-md mx-auto">
          <div className="text-6xl mb-5">🎯</div>
          <h2 className="text-xl font-bold mb-3">Help us learn your taste</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            We don't know your preferences yet. Rate some movies or pick your favourite genres so we can build a personalized list just for you.
          </p>
          <div className="flex flex-col gap-3 items-center">
            <Link to="/discover" className="btn-primary w-48 text-center">
              🎬 Browse & Rate
            </Link>
            <Link to="/dashboard?tab=prefs" className="btn-ghost w-48 text-center text-sm">
              ⚙️ Set Genre Preferences
            </Link>
          </div>
        </div>
      )}

      {/* Recommendations grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : recs.length > 0 ? (
        <>
          {!hasPrefs && (
            <div className="mb-5 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg text-yellow-300 text-sm flex items-center gap-2">
              <span>💡</span>
              <span>These are popular picks. <Link to="/dashboard?tab=prefs" className="underline hover:text-yellow-200">Set preferences</Link> or rate some movies to get truly personalized results.</span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recs.map(m => <MovieCard key={m.id} movie={m} />)}
          </div>
        </>
      ) : null}
    </div>
  )
}
