import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'

const GENRES = [
  { id: 28, name: 'Action' }, { id: 35, name: 'Comedy' }, { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' }, { id: 878, name: 'Sci-Fi' }, { id: 10749, name: 'Romance' },
  { id: 12, name: 'Adventure' }, { id: 16, name: 'Animation' }, { id: 53, name: 'Thriller' },
  { id: 14, name: 'Fantasy' },
]

const SkeletonCard = () => (
  <div className="skeleton aspect-[2/3] rounded-xl" />
)

export default function HomePage() {
  const [recs, setRecs]             = useState([])
  const [trending, setTrending]     = useState([])
  const [searchResults, setSearch]  = useState([])
  const [activeGenre, setActiveGenre] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const location = useLocation()
  const searchQuery = new URLSearchParams(location.search).get('search')

  const addToWatchlist = async (movieId) => {
    try {
      await api.post('/watchlist', { movieId })
    } catch (err) {
      console.error('Watchlist error:', err)
    }
  }

  // Load recommendations and trending
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [recsRes, trendRes] = await Promise.all([
          api.get('/recommendations'),
          api.get('/recommendations/trending'),
        ])
        setRecs(recsRes.data)
        setTrending(trendRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Handle search
  useEffect(() => {
    if (!searchQuery) { setSearch([]); return }
    const fetchSearch = async () => {
      setSearchLoading(true)
      try {
        const res = await api.get(`/movies/search?q=${encodeURIComponent(searchQuery)}`)
        setSearch(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setSearchLoading(false)
      }
    }
    fetchSearch()
  }, [searchQuery])

  const filterByGenre = useCallback(async (genreId) => {
    setActiveGenre(genreId)
    if (!genreId) return
    setLoading(true)
    try {
      const res = await api.get(`/movies?genreId=${genreId}&limit=20`)
      setRecs(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const MovieGrid = ({ movies, label }) => (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />
        {label}
      </h2>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : movies.length === 0 ? (
        <p className="text-gray-500 text-sm">No movies found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map(m => (
            <MovieCard key={m.id} movie={m} onWatchlist={addToWatchlist} />
          ))}
        </div>
      )}
    </section>
  )

  if (searchQuery) {
    return (
      <div className="animate-fade-in">
        <MovieGrid movies={searchResults} label={`Results for "${searchQuery}"`} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Genre filter strip */}
      <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => filterByGenre(null)}
          className={`badge shrink-0 cursor-pointer transition-all ${!activeGenre ? 'bg-primary text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
        >
          All
        </button>
        {GENRES.map(g => (
          <button
            key={g.id}
            onClick={() => filterByGenre(g.id)}
            className={`badge shrink-0 cursor-pointer transition-all ${activeGenre === g.id ? 'bg-primary text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <MovieGrid movies={recs} label="Recommended for You" />
      {!activeGenre && <MovieGrid movies={trending} label="Trending Now" />}
    </div>
  )
}
