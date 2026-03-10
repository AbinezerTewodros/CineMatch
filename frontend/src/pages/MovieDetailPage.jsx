import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'

const TMDB_ORIG = 'https://image.tmdb.org/t/p/original'
const TMDB_W500 = 'https://image.tmdb.org/t/p/w500'
const TMDB_W185 = 'https://image.tmdb.org/t/p/w185'

const PLACEHOLDER_PERSON = `https://placehold.co/185x278/1a1a2e/444?text=No+Photo`

// Status badge for TV shows
function TVStatusBadge({ status }) {
  const map = {
    'Returning Series': { cls: 'bg-green-600/80 text-green-100',  label: '🟢 Returning' },
    'Ended':            { cls: 'bg-gray-600/80 text-gray-200',    label: '⚫ Ended'     },
    'Canceled':         { cls: 'bg-red-700/80 text-red-100',      label: '🔴 Canceled'  },
    'In Production':    { cls: 'bg-blue-600/80 text-blue-100',    label: '🔵 In Prod.'  },
  }
  const s = map[status] ?? { cls: 'bg-white/10 text-gray-300', label: status }
  return <span className={`badge text-xs font-semibold px-2.5 py-1 ${s.cls}`}>{s.label}</span>
}

export default function MovieDetailPage() {
  const { id }         = useParams()
  const [searchParams] = useSearchParams()
  const mediaType      = searchParams.get('type') || 'movie'
  const navigate       = useNavigate()

  const [movie, setMovie]         = useState(null)
  const [details, setDetails]     = useState(null)   // live TMDB (cast, crew, trailer, tvInfo)
  const [similar, setSimilar]     = useState([])
  const [userRating, setUserRating]   = useState(0)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [trailerOpen, setTrailerOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true); setUserRating(0)
      try {
        const [movieRes, simRes, detailRes, ratRes, wlRes] = await Promise.all([
          api.get(`/movies/${id}?type=${mediaType}`),
          api.get(`/recommendations/similar/${id}`),
          api.get(`/media/${id}/details?type=${mediaType}`).catch(() => ({ data: null })),
          api.get('/ratings/me').catch(() => ({ data: [] })),
          api.get('/watchlist').catch(() => ({ data: [] })),
        ])
        setMovie(movieRes.data)
        setSimilar(simRes.data)
        setDetails(detailRes.data)

        const existingRating = ratRes.data.find(r => String(r.movie_id) === String(id))
        if (existingRating) setUserRating(existingRating.rating)

        const inWL = wlRes.data.some(m => String(m.id) === String(id))
        setInWatchlist(inWL)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, mediaType])

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 2500) }

  const handleRate = async (r) => {
    setUserRating(r)
    try { await api.post('/ratings', { movieId: Number(id), rating: r }); showMsg(`Rated ${r}/10 ⭐`) }
    catch (err) { console.error(err) }
  }

  const handleWatchlist = async () => {
    try {
      if (inWatchlist) {
        await api.delete(`/watchlist/${id}`); setInWatchlist(false); showMsg('Removed from watchlist')
      } else {
        await api.post('/watchlist', { movieId: Number(id) }); setInWatchlist(true); showMsg('Added to watchlist ✓')
      }
    } catch (err) { console.error(err) }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-5xl mx-auto">
      <div className="skeleton h-72 rounded-2xl" />
      <div className="skeleton h-8 w-64 rounded" />
      <div className="skeleton h-4 w-full rounded" />
    </div>
  )

  if (!movie) return (
    <div className="text-center py-20 text-gray-500">
      <p className="text-5xl mb-4">🎬</p>
      <p className="text-lg">Content not found.</p>
      <button onClick={() => navigate(-1)} className="btn-ghost mt-4 text-sm">← Go Back</button>
    </div>
  )

  const backdrop = movie.backdrop_path ? `${TMDB_ORIG}${movie.backdrop_path}`
    : movie.poster_path ? `${TMDB_W500}${movie.poster_path}` : null

  const genres = Array.isArray(movie.genres)
    ? movie.genres.filter(g => g && g !== 'null').map(g => typeof g === 'string' ? g : g?.name).filter(Boolean)
    : []

  const isTV = movie.media_type === 'tv' || mediaType === 'tv'
  const ratingColor = movie.vote_average >= 7 ? 'text-green-400' : movie.vote_average >= 5 ? 'text-yellow-400' : 'text-red-400'

  const cast     = details?.cast     || []
  const crew     = details?.crew     || []
  const trailer  = details?.trailer  || null
  const tvInfo   = details?.tvInfo   || null

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-10">
      {actionMsg && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-dark-200 border border-white/10 text-white text-sm px-5 py-2.5 rounded-full shadow-xl z-50 animate-fade-in">
          {actionMsg}
        </div>
      )}

      {/* ── Inline Trailer Modal ──────────────────────────────────────────── */}
      {trailerOpen && trailer && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={() => setTrailerOpen(false)}>
          <div
            className="relative w-full max-w-4xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setTrailerOpen(false)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-primary/80
                flex items-center justify-center text-white transition-colors backdrop-blur-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Title bar */}
            <div className="bg-[#0d0d18] px-4 py-3 flex items-center gap-2">
              <span className="text-red-500 text-sm">▶</span>
              <span className="text-sm font-semibold text-white truncate">{movie.title} — Official Trailer</span>
            </div>
            {/* 16:9 iframe */}
            <div className="relative" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`}
                title={`${movie.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Backdrop hero ─────────────────────────────────────────────────── */}
      {backdrop && (
        <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
          <img src={backdrop} alt={movie.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-100 via-dark-100/60 to-transparent" />
          <button onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-primary/80 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="absolute top-4 right-4 flex gap-2">
            {isTV && tvInfo?.status && <TVStatusBadge status={tvInfo.status} />}
            <div className={`badge font-bold ${isTV ? 'bg-blue-600 text-white' : 'bg-primary text-white'}`}>
              {isTV ? '📺 TV SHOW' : '🎬 MOVIE'}
            </div>
          </div>
          {/* Trailer button — opens inline modal */}
          {trailer && (
            <button
              onClick={() => setTrailerOpen(true)}
              className="absolute bottom-4 right-4 flex items-center gap-2 bg-red-600/90 hover:bg-red-600
                text-white text-sm font-semibold px-4 py-2 rounded-full transition-all hover:scale-105 shadow-lg">
              ▶ Watch Trailer
            </button>
          )}
        </div>
      )}

      {/* ── Hero info row ─────────────────────────────────────────────────── */}
      <div className="flex gap-6 mb-8">
        {movie.poster_path && (
          <img src={`${TMDB_W500}${movie.poster_path}`} alt={movie.title}
            className="w-32 md:w-44 rounded-xl shadow-2xl shrink-0 -mt-16 relative z-10 border border-white/10" />
        )}
        <div className="flex-1 pt-2">
          <h1 className="text-2xl md:text-3xl font-black mb-2">{movie.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {movie.release_date && (
              <span className="text-gray-400 text-sm">
                {new Date(movie.release_date).getFullYear()}
              </span>
            )}
            {/* TV-specific: seasons + episodes */}
            {isTV && tvInfo && (
              <span className="text-gray-400 text-sm">
                📺 {tvInfo.number_of_seasons} Season{tvInfo.number_of_seasons !== 1 ? 's' : ''}
                {tvInfo.number_of_episodes ? ` · ${tvInfo.number_of_episodes} Episodes` : ''}
              </span>
            )}
            {tvInfo?.networks?.length > 0 && (
              <span className="badge bg-white/10 text-gray-300 text-xs">
                {tvInfo.networks.map(n => n.name).join(' · ')}
              </span>
            )}
            <span className={`font-bold text-sm ${ratingColor}`}>
              ★ {movie.vote_average?.toFixed(1) ?? 'N/A'}
            </span>
            <span className="text-gray-500 text-xs">({movie.vote_count?.toLocaleString()} votes)</span>
            {genres.map(g => <span key={g} className="badge bg-white/10 text-gray-300">{g}</span>)}
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{movie.overview}</p>

          {/* Director / Creator */}
          {crew.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3 items-center">
              <span className="text-gray-500 text-xs uppercase tracking-wider">
                {isTV ? 'Created by' : 'Directed by'}
              </span>
              {crew.filter(c => isTV ? true : c.job === 'Director').map(c => (
                <Link key={c.id} to={`/person/${c.id}`}
                  className="text-sm font-semibold text-gray-200 hover:text-primary transition-colors underline underline-offset-2">
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Actions card ─────────────────────────────────────────────────── */}
      <div className="card p-5 mb-8">
        <div className="flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-400 mr-2">Your rating:</span>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => handleRate(n)}
                className={`text-xl transition-colors leading-none ${n <= userRating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}`}>★</button>
            ))}
            {userRating > 0 && <span className="ml-2 badge bg-yellow-500/20 text-yellow-400 font-bold">{userRating}/10</span>}
          </div>
          <button onClick={handleWatchlist}
            className={`btn-ghost text-sm ${inWatchlist ? 'border border-primary/50 text-primary' : ''}`}>
            {inWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
          </button>
        </div>
      </div>

      {/* ── Cast Section ─────────────────────────────────────────────────── */}
      {cast.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full" />
            Cast
          </h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {cast.map(actor => (
              <Link key={actor.id} to={`/person/${actor.id}`}
                className="shrink-0 w-24 group text-center">
                <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-2 border-2 border-white/10
                  transition-all duration-300 group-hover:border-primary group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20">
                  <img
                    src={actor.profile_path ? `${TMDB_W185}${actor.profile_path}` : PLACEHOLDER_PERSON}
                    alt={actor.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">{actor.name}</p>
                {actor.character && (
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{actor.character}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Similar content ───────────────────────────────────────────────── */}
      {similar.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full" />
            Similar {isTV ? 'Shows' : 'Movies'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {similar.map(m => <MovieCard key={m.id} movie={m} />)}
          </div>
        </section>
      )}
    </div>
  )
}
