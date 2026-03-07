import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'

const TMDB_IMAGE = 'https://image.tmdb.org/t/p/original'
const TMDB_W500  = 'https://image.tmdb.org/t/p/w500'

export default function MovieDetailPage() {
  const { id }            = useParams()
  const [searchParams]    = useSearchParams()
  const mediaType         = searchParams.get('type') || 'movie'
  const navigate          = useNavigate()

  const [movie, setMovie]           = useState(null)
  const [similar, setSimilar]       = useState([])
  const [userRating, setUserRating] = useState(0)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [actionMsg, setActionMsg]   = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setUserRating(0)
      try {
        const [movieRes, simRes, ratRes, wlRes] = await Promise.all([
          api.get(`/movies/${id}`),
          api.get(`/recommendations/similar/${id}`),
          api.get('/ratings/me').catch(() => ({ data: [] })),
          api.get('/watchlist').catch(() => ({ data: [] })),
        ])
        setMovie(movieRes.data)
        setSimilar(simRes.data)

        // Pre-fill user's existing rating for this item
        const existingRating = ratRes.data.find(r => String(r.movie_id) === String(id))
        if (existingRating) setUserRating(existingRating.rating)

        // Pre-fill watchlist state
        const inWL = wlRes.data.some(m => String(m.id) === String(id))
        setInWatchlist(inWL)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const showMsg = (msg) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(''), 2500)
  }

  const handleRate = async (r) => {
    setUserRating(r)
    try {
      await api.post('/ratings', { movieId: Number(id), rating: r })
      showMsg(`Rated ${r}/10 ⭐`)
    } catch (err) { console.error(err) }
  }

  const handleWatchlist = async () => {
    try {
      if (inWatchlist) {
        await api.delete(`/watchlist/${id}`)
        setInWatchlist(false)
        showMsg('Removed from watchlist')
      } else {
        await api.post('/watchlist', { movieId: Number(id) })
        setInWatchlist(true)
        showMsg('Added to watchlist ✓')
      }
    } catch (err) { console.error(err) }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-5xl mx-auto">
      <div className="skeleton h-72 rounded-2xl" />
      <div className="skeleton h-8 w-64 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-3/4 rounded" />
    </div>
  )

  if (!movie) return (
    <div className="text-center py-20 text-gray-500">
      <p className="text-5xl mb-4">🎬</p>
      <p className="text-lg">Content not found in local database.</p>
      <button onClick={() => navigate(-1)} className="btn-ghost mt-4 text-sm">← Go Back</button>
    </div>
  )

  const backdrop = movie.backdrop_path
    ? `${TMDB_IMAGE}${movie.backdrop_path}`
    : movie.poster_path ? `${TMDB_W500}${movie.poster_path}` : null

  // Normalize genres — can be array of strings or objects depending on the query
  const genres = Array.isArray(movie.genres)
    ? movie.genres
        .filter(g => g && g !== 'null')
        .map(g => (typeof g === 'string' ? g : g?.name))
        .filter(Boolean)
    : []

  const isTV = movie.media_type === 'tv' || mediaType === 'tv'
  const ratingColor = movie.vote_average >= 7
    ? 'text-green-400'
    : movie.vote_average >= 5 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Toast message */}
      {actionMsg && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-dark-200 border border-white/10 text-white text-sm px-5 py-2.5 rounded-full shadow-xl z-50 animate-fade-in">
          {actionMsg}
        </div>
      )}

      {/* Backdrop hero */}
      {backdrop && (
        <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
          <img src={backdrop} alt={movie.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-100 via-dark-100/60 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-primary/80 transition-colors"
          >
            ←
          </button>
          {/* Media type badge */}
          <div className={`absolute top-4 right-4 badge font-bold ${isTV ? 'bg-blue-600 text-white' : 'bg-primary text-white'}`}>
            {isTV ? '📺 TV SHOW' : '🎬 MOVIE'}
          </div>
        </div>
      )}

      <div className="flex gap-6 mb-8">
        {/* Poster */}
        {movie.poster_path && (
          <img
            src={`${TMDB_W500}${movie.poster_path}`}
            alt={movie.title}
            className="w-32 md:w-44 rounded-xl shadow-2xl shrink-0 -mt-16 relative z-10 border border-white/10"
          />
        )}

        <div className="flex-1 pt-2">
          <h1 className="text-2xl md:text-3xl font-black mb-2">{movie.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {movie.release_date && (
              <span className="text-gray-400 text-sm">
                {isTV ? '📅 ' : ''}{new Date(movie.release_date).getFullYear()}
              </span>
            )}
            <span className={`font-bold text-sm ${ratingColor}`}>
              ★ {movie.vote_average?.toFixed(1) ?? 'N/A'}
            </span>
            <span className="text-gray-500 text-xs">({movie.vote_count?.toLocaleString()} votes)</span>
            {genres.map(g => (
              <span key={g} className="badge bg-white/10 text-gray-300">{g}</span>
            ))}
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{movie.overview}</p>
        </div>
      </div>

      {/* Actions card */}
      <div className="card p-5 mb-8">
        <div className="flex flex-wrap gap-6 items-center">
          {/* Star rating */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-400 mr-2">Your rating:</span>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                onClick={() => handleRate(n)}
                className={`text-xl transition-colors leading-none ${n <= userRating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}`}
              >★</button>
            ))}
            {userRating > 0 && (
              <span className="ml-2 badge bg-yellow-500/20 text-yellow-400 font-bold">{userRating}/10</span>
            )}
          </div>

          <button
            onClick={handleWatchlist}
            className={`btn-ghost text-sm ${inWatchlist ? 'border border-primary/50 text-primary' : ''}`}
          >
            {inWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
          </button>
        </div>
      </div>

      {/* Similar content */}
      {similar.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full" />
            Similar {isTV ? 'Shows' : 'Movies'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {similar.map(m => <MovieCard key={m.id} movie={m} />)}
          </div>
        </div>
      )}
    </div>
  )
}
