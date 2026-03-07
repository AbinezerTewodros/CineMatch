import { Link } from 'react-router-dom'

const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500'

// Derive badge based on media_type and genre list
function getMediaBadge(movie) {
  const isTV    = movie.media_type === 'tv'
  const genreIds = movie.genre_ids || []
  // Check for Animation genre (id=16) in either format
  const isAnime = genreIds.includes(16) ||
    (Array.isArray(movie.genres) && movie.genres.some(g =>
      g === 'Animation' || g?.name === 'Animation'
    ))

  if (isTV && isAnime) return { label: 'ANIME',  cls: 'bg-purple-600/90 text-white' }
  if (isTV)            return { label: 'TV',     cls: 'bg-blue-600/90 text-white'   }
  if (isAnime)         return { label: 'ANIME',  cls: 'bg-purple-600/90 text-white' }
  return               { label: 'FILM',   cls: 'bg-primary/90 text-white'    }
}

export default function MovieCard({ movie, onWatchlist }) {
  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE}${movie.poster_path}`
    : `https://placehold.co/300x450/1a1a2e/666666?text=${encodeURIComponent(movie.title?.slice(0, 20) ?? '')}`

  const rating      = movie.vote_average ? Number(movie.vote_average).toFixed(1) : 'N/A'
  const ratingNum   = Number(movie.vote_average) || 0
  const ratingColor = ratingNum >= 7 ? 'text-green-400' : ratingNum >= 5 ? 'text-yellow-400' : 'text-red-400'
  const badge       = getMediaBadge(movie)

  const detailPath  = `/movie/${movie.id}${movie.media_type === 'tv' ? '?type=tv' : ''}`

  return (
    <div className="movie-card">
      <Link to={detailPath}>
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full aspect-[2/3] object-cover"
          loading="lazy"
        />

        {/* Dark gradient overlay — triggered by .movie-card:hover .overlay-gradient in CSS */}
        <div className="overlay-gradient" />

        {/* Rating badge — top right */}
        <div className={`absolute top-2 right-2 badge bg-black/70 backdrop-blur-sm font-bold text-xs ${ratingColor}`}>
          ★ {rating}
        </div>

        {/* Media type badge — top left */}
        <div className={`absolute top-2 left-2 badge text-[10px] font-bold tracking-wide ${badge.cls}`}>
          {badge.label}
        </div>

        {/* Hover info strip — bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 transition-all duration-300"
          style={{ transform: 'translateY(4px)', opacity: 0 }}
          ref={el => {
            if (!el) return
            const card = el.closest('.movie-card')
            if (!card) return
            const show  = () => { el.style.opacity = '1'; el.style.transform = 'translateY(0)' }
            const hide  = () => { el.style.opacity = '0'; el.style.transform = 'translateY(4px)' }
            card.addEventListener('mouseenter', show)
            card.addEventListener('mouseleave', hide)
          }}
        >
          <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 mb-0.5">
            {movie.title}
          </h3>
          {movie.release_date && (
            <p className="text-gray-400 text-xs">{new Date(movie.release_date).getFullYear()}</p>
          )}
        </div>
      </Link>

      {/* Watchlist button — bottom right, visible on hover via CSS */}
      {onWatchlist && (
        <button
          onClick={e => { e.preventDefault(); onWatchlist(movie.id) }}
          title="Add to watchlist"
          className="watchlist-btn absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm text-white hover:bg-primary transition-colors flex items-center justify-center text-base font-bold opacity-0 transition-opacity duration-300"
          style={{ opacity: 0 }}
          ref={el => {
            if (!el) return
            const card = el.closest('.movie-card')
            if (!card) return
            card.addEventListener('mouseenter', () => { el.style.opacity = '1' })
            card.addEventListener('mouseleave', () => { el.style.opacity = '0' })
          }}
        >
          +
        </button>
      )}
    </div>
  )
}
