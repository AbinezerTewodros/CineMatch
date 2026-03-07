import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'

const MEDIA_TABS = [
  { id: 'all',   label: '🌐 All'      },
  { id: 'movie', label: '🎬 Movies'   },
  { id: 'tv',    label: '📺 TV Shows' },
  { id: 'anime', label: '🎌 Anime'    },
]

const SkeletonCard = () => <div className="skeleton aspect-[2/3] rounded-xl" />

export default function HomePage() {
  const [content, setContent]   = useState([])
  const [trending, setTrending]   = useState([])
  const [searchResults, setSearch]= useState([])
  const [searchSource, setSearchSource] = useState(null)
  const [genres, setGenres]       = useState([])
  const [activeGenre, setActiveGenre]   = useState(null)
  const [mediaType, setMediaType]       = useState('all')
  const [loading, setLoading]           = useState(true)

  const location    = useLocation()
  const searchQuery = new URLSearchParams(location.search).get('search')

  // ── Load genres from API ───────────────────────────────────────────────────
  useEffect(() => {
    api.get('/genres').then(res => setGenres(res.data)).catch(console.error)
  }, [])

  // ── Watchlist helper ───────────────────────────────────────────────────────
  const addToWatchlist = async (movieId) => {
    try { await api.post('/watchlist', { movieId }) }
    catch (err) { console.error('Watchlist error:', err) }
  }

  // ── Load recommendations + trending ───────────────────────────────────────
  useEffect(() => {
    if (searchQuery) return
    const load = async () => {
      setLoading(true)
      try {
        const typeParam = mediaType !== 'all' ? `?type=${mediaType}&limit=24` : `?limit=24`
        const trendRes = await api.get(`/recommendations/trending${typeParam}`)
        setContent(trendRes.data)
        setTrending(trendRes.data)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [mediaType, searchQuery])

  // ── Handle search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery) { setSearch([]); setSearchSource(null); return }
    const fetchSearch = async () => {
      setLoading(true)
      try {
        const typeParam = mediaType !== 'all' ? `&type=${mediaType}` : ''
        const res = await api.get(`/movies/search?q=${encodeURIComponent(searchQuery)}${typeParam}`)
        setSearch(res.data.results || res.data)
        setSearchSource(res.data.source || 'local')
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchSearch()
  }, [searchQuery, mediaType])

  // ── Genre filter ───────────────────────────────────────────────────────────
  const filterByGenre = useCallback(async (genreId) => {
    setActiveGenre(genreId)
    if (!genreId) {
      // Reset: reload default recs
      setLoading(true)
      try {
        const [recsRes] = await Promise.all([api.get('/recommendations')])
        setRecs(recsRes.data)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
      return
    }
    setLoading(true)
    try {
      const typeParam = mediaType !== 'all' ? `&type=${mediaType}` : ''
      const res = await api.get(`/movies?genreId=${genreId}&limit=24${typeParam}`)
      setContent(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [mediaType])

  const handleMediaTypeChange = (type) => {
    setMediaType(type)
    setActiveGenre(null)
  }

  // ── Subcomponent ───────────────────────────────────────────────────────────
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
        <p className="text-gray-500 text-sm py-8">No content found. Try a different filter.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map(m => <MovieCard key={m.id} movie={m} onWatchlist={addToWatchlist} />)}
        </div>
      )}
    </section>
  )

  // ── Search results view ────────────────────────────────────────────────────
  if (searchQuery) {
    return (
      <div className="animate-fade-in">
        {searchSource === 'tmdb' && (
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg text-blue-300 text-sm flex items-center gap-2">
            <span>🌐</span>
            <span>Showing live results from TMDB — some items may not be in the local database</span>
          </div>
        )}
        <MovieGrid movies={searchResults} label={`Results for "${searchQuery}"`} />
      </div>
    )
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Media type tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
        {MEDIA_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleMediaTypeChange(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${mediaType === tab.id ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Genre filter strip — loaded dynamically from API */}
      <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => filterByGenre(null)}
          className={`badge shrink-0 cursor-pointer transition-all ${!activeGenre ? 'bg-primary text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
        >
          All Genres
        </button>
        {genres.map(g => (
          <button
            key={g.id}
            onClick={() => filterByGenre(g.id)}
            className={`badge shrink-0 cursor-pointer transition-all ${activeGenre === g.id ? 'bg-primary text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <MovieGrid movies={content} label={activeGenre ? 'Filtered Results' : `Trending — ${MEDIA_TABS.find(t => t.id === mediaType)?.label ?? 'All'}`} />
    </div>
  )
}
