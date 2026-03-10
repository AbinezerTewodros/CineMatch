import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import MovieCard from '../components/MovieCard'

const TMDB_W500 = 'https://image.tmdb.org/t/p/w500'
const TMDB_H632 = 'https://image.tmdb.org/t/p/h632'

const TABS = ['Acting', 'Directing']

const SkeletonCard = () => <div className="skeleton aspect-[2/3] rounded-xl" />

export default function PersonPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  const [person, setPerson]   = useState(null)
  const [credits, setCredits] = useState({ acting: [], directing: [] })
  const [tab, setTab]         = useState('Acting')
  const [bioExpanded, setBioExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [personRes, creditsRes] = await Promise.all([
          api.get(`/person/${id}`),
          api.get(`/person/${id}/credits`),
        ])
        setPerson(personRes.data)
        setCredits(creditsRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return (
    <div className="max-w-5xl mx-auto animate-pulse space-y-6">
      <div className="flex gap-6">
        <div className="skeleton w-36 h-52 rounded-xl shrink-0" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="skeleton h-8 w-64 rounded" />
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-24 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  if (!person) return (
    <div className="text-center py-20 text-gray-500">
      <p className="text-5xl mb-4">👤</p>
      <p className="text-lg">Person not found.</p>
      <button onClick={() => navigate(-1)} className="btn-ghost mt-4 text-sm">← Go Back</button>
    </div>
  )

  const items = tab === 'Acting' ? credits.acting : credits.directing
  const bioShort = person.biography?.slice(0, 400)
  const bioFull  = person.biography

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-10">

      {/* ── Person hero ───────────────────────────────────────────────────── */}
      <div className="flex gap-6 mb-8">
        {/* Back button */}
        <div className="flex flex-col gap-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <img
            src={person.profile_path ? `${TMDB_H632}${person.profile_path}` : `https://placehold.co/185x278/1a1a2e/444?text=No+Photo`}
            alt={person.name}
            className="w-36 rounded-xl shadow-2xl border border-white/10 object-cover"
          />
        </div>

        <div className="flex-1 pt-1">
          <h1 className="text-3xl font-black mb-1">{person.name}</h1>
          <p className="text-gray-400 text-sm mb-1">
            {person.known_for_department}
            {person.birthday ? ` · Born ${new Date(person.birthday).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}` : ''}
          </p>
          {person.place_of_birth && (
            <p className="text-gray-500 text-xs mb-3">📍 {person.place_of_birth}</p>
          )}

          {/* Biography */}
          {bioFull && (
            <div className="mt-2">
              <p className="text-gray-300 text-sm leading-relaxed">
                {bioExpanded ? bioFull : (bioFull.length > 400 ? `${bioShort}...` : bioFull)}
              </p>
              {bioFull.length > 400 && (
                <button onClick={() => setBioExpanded(b => !b)}
                  className="text-primary text-xs mt-1 hover:underline">
                  {bioExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            disabled={t === 'Directing' && credits.directing.length === 0}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t ? 'bg-primary text-white' : 'text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'}`}>
            {t} ({t === 'Acting' ? credits.acting.length : credits.directing.length})
          </button>
        ))}
      </div>

      {/* ── Credits grid ─────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm py-8">No {tab.toLowerCase()} credits found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map(m => (
            <Link key={`${m.id}-${m.media_type}`}
              to={`/movie/${m.id}?type=${m.media_type}`}
              className="group text-left">
              <div className="relative rounded-xl overflow-hidden aspect-[2/3] mb-2
                transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/20">
                <img
                  src={m.poster_path
                    ? `${TMDB_W500}${m.poster_path}`
                    : `https://placehold.co/200x300/1a1a2e/444?text=${encodeURIComponent(m.title?.slice(0,10) ?? '')}`}
                  alt={m.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-1.5 right-1.5 badge bg-black/70 text-yellow-400 text-[10px] font-bold">
                  ★ {m.vote_average?.toFixed(1)}
                </div>
                <div className={`absolute top-1.5 left-1.5 badge text-[9px] font-bold
                  ${m.media_type === 'tv' ? 'bg-blue-600' : 'bg-primary'}`}>
                  {m.media_type === 'tv' ? 'TV' : 'FILM'}
                </div>
              </div>
              <p className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                {m.title}
              </p>
              {m.character && (
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 italic">as {m.character}</p>
              )}
              {m.release_date && (
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {new Date(m.release_date).getFullYear()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
