import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'

const TMDB_IMAGE = 'https://image.tmdb.org/t/p/original'
const TMDB_W500  = 'https://image.tmdb.org/t/p/w500'

export default function MovieDetailPage() {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const [movie, setMovie]   = useState(null)
  const [similar, setSimilar] = useState([])
  const [rating, setRating]   = useState(0)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [movieRes, simRes] = await Promise.all([
          api.get(`/movies/${id}`),
          api.get(`/recommendations/similar/${id}`),
        ])
        setMovie(movieRes.data)
        setSimilar(simRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleRate = async (r) => {
    setRating(r)
    try {
      await api.post('/ratings', { movieId: Number(id), rating: r })
    } catch (err) {
      console.error(err)
    }
  }

  const handleWatchlist = async () => {
    try {
      if (inWatchlist) {
        await api.delete(`/watchlist/${id}`)
        setInWatchlist(false)
      } else {
        await api.post('/watchlist', { movieId: Number(id) })
        setInWatchlist(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="skeleton h-72 rounded-2xl" />
      <div className="skeleton h-8 w-64 rounded" />
      <div className="skeleton h-4 w-full rounded" />
    </div>
  )

  if (!movie) return (
    <div className="text-center py-20 text-gray-500">Movie not found.</div>
  )

  const backdrop = movie.backdrop_path
    ? `${TMDB_IMAGE}${movie.backdrop_path}`
    : movie.poster_path ? `${TMDB_W500}${movie.poster_path}` : null

  const genres = Array.isArray(movie.genres)
    ? movie.genres.filter(g => g && g !== 'null' && g.name).map(g => typeof g === 'string' ? g : g.name)
    : []

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Backdrop hero */}
      {backdrop && (
        <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
          <img src={backdrop} alt={movie.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-100 via-dark-100/60 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-primary/80 transition-colors text-lg"
          >
            ←
          </button>
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
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {movie.release_date && (
              <span className="text-gray-400 text-sm">{new Date(movie.release_date).getFullYear()}</span>
            )}
            <span className="text-green-400 font-bold text-sm">★ {movie.vote_average?.toFixed(1)}</span>
            {genres.map(g => (
              <span key={g} className="badge bg-white/10 text-gray-300">{g}</span>
            ))}
          </div>
          <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">{movie.overview}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="card p-5 mb-8 flex flex-wrap gap-4 items-center">
        {/* Rating stars */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-400 mr-1">Your rating:</span>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              onClick={() => handleRate(n)}
              className={`text-lg transition-colors ${n <= rating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}`}
            >★</button>
          ))}
        </div>

        <button
          onClick={handleWatchlist}
          className={`btn-ghost text-sm ${inWatchlist ? 'border border-primary/50 text-primary' : ''}`}
        >
          {inWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
        </button>
      </div>

      {/* Similar movies */}
      {similar.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full" />
            Similar Movies
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {similar.map(m => <MovieCard key={m.id} movie={m} />)}
          </div>
        </div>
      )}
    </div>
  )
}
