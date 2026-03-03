import { Link } from 'react-router-dom'

const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500'

export default function MovieCard({ movie, onRate, onWatchlist }) {
  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE}${movie.poster_path}`
    : `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`

  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'
  const ratingColor = movie.vote_average >= 7 ? 'text-green-400' : movie.vote_average >= 5 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="movie-card">
      <Link to={`/movie/${movie.id}`}>
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full aspect-[2/3] object-cover"
          loading="lazy"
        />
        <div className="overlay-gradient" />

        {/* Rating badge */}
        <div className={`absolute top-2 right-2 badge bg-black/70 backdrop-blur-sm font-bold ${ratingColor}`}>
          ★ {rating}
        </div>

        {/* Movie info on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 mb-1">
            {movie.title}
          </h3>
          {movie.release_date && (
            <p className="text-gray-400 text-xs">{new Date(movie.release_date).getFullYear()}</p>
          )}
        </div>
      </Link>

      {/* Action buttons on hover */}
      {(onWatchlist || onRate) && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-1.5">
          {onWatchlist && (
            <button
              onClick={(e) => { e.preventDefault(); onWatchlist(movie.id) }}
              title="Add to watchlist"
              className="w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm text-white hover:bg-primary/80 transition-colors flex items-center justify-center text-sm"
            >
              +
            </button>
          )}
        </div>
      )}
    </div>
  )
}
