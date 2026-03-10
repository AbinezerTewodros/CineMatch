import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'

const PAGE_SIZE = 36

const SORT_OPTIONS = [
  { id: 'popularity', label: 'Most Popular'   },
  { id: 'rating',     label: 'Highest Rated'  },
  { id: 'newest',     label: 'Newest First'   },
  { id: 'oldest',     label: 'Oldest First'   },
]

const SkeletonCard = () => <div className="skeleton aspect-[2/3] rounded-xl animate-pulse" />

// Divider shown before newly loaded batch
const BatchDivider = ({ page }) => (
  <div className="col-span-full flex items-center gap-3 py-2">
    <div className="flex-1 h-px bg-white/8" />
    <span className="text-[11px] text-gray-600 bg-white/5 border border-white/8 rounded-full px-3 py-0.5 shrink-0">
      Page {page}
    </span>
    <div className="flex-1 h-px bg-white/8" />
  </div>
)

export default function HomePage() {
  // Content split into pages so we can show dividers between batches
  const [pages, setPages]             = useState([])   // [{ page: 1, items: [] }, ...]
  const [searchResults, setSearch]    = useState([])
  const [searchSource, setSearchSource] = useState(null)
  const [mediaType, setMediaType]     = useState('all')
  const [sort, setSort]               = useState('popularity')
  const [sortOpen, setSortOpen]       = useState(false)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const sortRef  = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  const params     = new URLSearchParams(location.search)
  const searchQuery = params.get('search')
  const urlType    = params.get('type')
  const urlGenreId = params.get('genreId')
  const urlSort    = params.get('sort')   // 'top_rated' from Navbar

  // Close sort dropdown on outside click
  useEffect(() => {
    const close = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // Sync URL type → state
  useEffect(() => {
    if (urlType && ['movie', 'tv', 'anime'].includes(urlType)) setMediaType(urlType)
    else if (!urlType) setMediaType('all')
  }, [urlType, urlGenreId])

  // ── Apply sort to a list ──────────────────────────────────────────────────
  const applySortClient = useCallback((list) => {
    const arr = [...list]
    if (sort === 'rating')  return arr.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
    if (sort === 'newest')  return arr.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0))
    if (sort === 'oldest')  return arr.sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0))
    return arr // popularity — already sorted by backend
  }, [sort])

  // ── Fetch a page ──────────────────────────────────────────────────────────
  const fetchContent = useCallback(async (pageNum, append = false) => {
    append ? setLoadingMore(true) : setLoading(true)
    try {
      let rows = []

      // Top IMDb from navbar uses backend sort
      if (urlSort === 'top_rated') {
        const res = await api.get(`/movies?limit=${PAGE_SIZE}&page=${pageNum}`)
        rows = res.data.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
      } else if (urlGenreId) {
        const tp = urlType && urlType !== 'all' ? `&type=${urlType}` : ''
        const res = await api.get(`/movies?genreId=${urlGenreId}&limit=${PAGE_SIZE}&page=${pageNum}${tp}`)
        rows = applySortClient(res.data)
      } else {
        const type = urlType || mediaType
        const tp = type !== 'all'
          ? `?type=${type}&limit=${PAGE_SIZE}&page=${pageNum}`
          : `?limit=${PAGE_SIZE}&page=${pageNum}`
        const res = await api.get(`/recommendations/trending${tp}`)
        rows = applySortClient(res.data)
      }

      setHasMore(rows.length === PAGE_SIZE)
      const batch = { page: pageNum, items: rows }
      setPages(prev => append ? [...prev, batch] : [batch])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMore(false)
      setLoading(false)
    }
  }, [urlType, urlGenreId, urlSort, mediaType, applySortClient])

  // Reset on URL or sort change
  useEffect(() => {
    if (searchQuery) return
    setCurrentPage(1)
    setHasMore(true)
    fetchContent(1, false)
  }, [mediaType, searchQuery, urlType, urlGenreId, urlSort, sort])

  const loadMore = () => {
    const next = currentPage + 1
    setCurrentPage(next)
    fetchContent(next, true)
  }

  const addToWatchlist = async (movieId) => {
    try { await api.post('/watchlist', { movieId }) }
    catch (err) { console.error('Watchlist error:', err) }
  }

  // ── Search ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery) { setSearch([]); setSearchSource(null); return }
    const run = async () => {
      setLoading(true)
      try {
        const tp = mediaType !== 'all' ? `&type=${mediaType}` : ''
        const res = await api.get(`/movies/search?q=${encodeURIComponent(searchQuery)}${tp}`)
        setSearch(applySortClient(res.data.results || res.data))
        setSearchSource(res.data.source || 'local')
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    run()
  }, [searchQuery, mediaType, applySortClient])

  const allContent = pages.flatMap(p => p.items)

  const sectionLabel = urlGenreId
    ? `Genre: ${params.get('genre') || 'Filtered'}`
    : urlType === 'movie'      ? '🎬 Movies'
    : urlType === 'tv'        ? '📺 TV Shows'
    : urlSort === 'top_rated' ? '⭐ Top IMDb'
    : 'Trending'

  const currentSortLabel = SORT_OPTIONS.find(s => s.id === sort)?.label || 'Sort'

  // ── Search results ────────────────────────────────────────────────────────
  if (searchQuery) {
    return (
      <div className="animate-fade-in">
        {searchSource === 'tmdb' && (
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg text-blue-300 text-sm flex items-center gap-2">
            <span>🌐</span> Live results from TMDB — some may not be in local DB
          </div>
        )}
        <SortBar sort={sort} setSort={setSort} sortOpen={sortOpen} setSortOpen={setSortOpen} sortRef={sortRef} currentSortLabel={currentSortLabel} />
        {loading ? <SkeletonGrid /> : (
          <SimpleGrid movies={searchResults} label={`Results for "${searchQuery}"`} onWatchlist={addToWatchlist} />
        )}
      </div>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Header row: title + sort */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-1 h-6 bg-primary rounded-full" />{sectionLabel}
        </h2>
        <SortBar sort={sort} setSort={setSort} sortOpen={sortOpen} setSortOpen={setSortOpen} sortRef={sortRef} currentSortLabel={currentSortLabel} />
      </div>

      {/* Grid with page dividers */}
      {loading ? <SkeletonGrid /> : allContent.length === 0 ? (
        <p className="text-gray-500 text-sm py-12 text-center">No content found. Try a different filter.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pages.map((batch, bIdx) => (
            <>
              {/* Visual separator between batches (not before first) */}
              {bIdx > 0 && <BatchDivider key={`div-${batch.page}`} page={batch.page} />}
              {batch.items.map(m => (
                <div key={m.id}
                  className={bIdx > 0 ? 'animate-fade-in' : ''}>
                  <MovieCard movie={m} onWatchlist={addToWatchlist} />
                </div>
              ))}
            </>
          ))}
        </div>
      )}

      {/* Load More */}
      {!loading && allContent.length > 0 && (
        <div className="flex justify-center mt-6 pb-4">
          {hasMore ? (
            <button onClick={loadMore} disabled={loadingMore}
              className="flex items-center gap-2.5 px-8 py-2.5 rounded-full border border-white/15
                bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-300 hover:text-white
                transition-all duration-200 disabled:opacity-50
                hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
              {loadingMore ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Loading…
                </>
              ) : (
                <>
                  Load More
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          ) : (
            <p className="text-gray-600 text-xs py-2">· You've seen it all ·</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SortBar({ sort, setSort, sortOpen, setSortOpen, sortRef, currentSortLabel }) {
  return (
    <div className="relative" ref={sortRef}>
      <button onClick={() => setSortOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border
          ${sortOpen ? 'bg-white/12 border-white/20 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5" />
        </svg>
        {currentSortLabel}
        <svg className={`w-3 h-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {sortOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#0d0d18] border border-white/15 rounded-xl shadow-2xl z-50 py-1.5 animate-fade-in">
          {SORT_OPTIONS.map(o => (
            <button key={o.id} onClick={() => { setSort(o.id); setSortOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors
                ${sort === o.id
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-gray-300 hover:bg-white/8 hover:text-white'}`}>
              {sort === o.id && <span className="mr-1.5">✓</span>}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

function SimpleGrid({ movies, label, onWatchlist }) {
  return (
    <section>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />{label}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {movies.map(m => <MovieCard key={m.id} movie={m} onWatchlist={onWatchlist} />)}
      </div>
    </section>
  )
}
