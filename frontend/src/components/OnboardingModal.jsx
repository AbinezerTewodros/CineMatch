import { useState, useEffect } from 'react'
import api from '../lib/api'

// ── Step data ─────────────────────────────────────────────────────────────────
const MOODS = [
  { id: 'funny',       emoji: '😂', label: 'Make me Laugh'   },
  { id: 'thrilling',   emoji: '😱', label: 'Edge of my Seat' },
  { id: 'emotional',   emoji: '😢', label: 'Deep Emotions'   },
  { id: 'mindBending', emoji: '🤔', label: 'Mind-Bending'    },
  { id: 'romantic',    emoji: '❤️', label: 'Romantic'        },
  { id: 'adventure',   emoji: '🚀', label: 'Adventure'       },
  { id: 'scary',       emoji: '👻', label: 'Scary'           },
  { id: 'inspiring',   emoji: '💪', label: 'Inspirational'   },
  { id: 'action',      emoji: '💥', label: 'Pure Action'     },
]

const ERAS = [
  { id: 'classic', emoji: '🎞', label: 'Classic (before 1980)' },
  { id: 'golden',  emoji: '📼', label: 'Golden Era (1980-2000)'},
  { id: 'modern',  emoji: '💿', label: 'Modern (2000-2015)'    },
  { id: 'recent',  emoji: '📱', label: 'Recent (2015+)'        },
]

const LANGS = [
  { id: 'en', flag: '🇺🇸', label: 'English'   },
  { id: 'ko', flag: '🇰🇷', label: 'Korean'    },
  { id: 'ja', flag: '🇯🇵', label: 'Japanese'  },
  { id: 'es', flag: '🇪🇸', label: 'Spanish'   },
  { id: 'fr', flag: '🇫🇷', label: 'French'    },
  { id: 'hi', flag: '🇮🇳', label: 'Hindi'     },
  { id: 'de', flag: '🇩🇪', label: 'German'    },
  { id: 'it', flag: '🇮🇹', label: 'Italian'   },
  { id: 'zh', flag: '🇨🇳', label: 'Chinese'   },
  { id: 'pt', flag: '🇧🇷', label: 'Portuguese'},
  { id: 'tr', flag: '🇹🇷', label: 'Turkish'   },
  { id: 'ar', flag: '🇸🇦', label: 'Arabic'    },
]

const GENRE_OPTIONS = [
  { id: 28,    label: '💥 Action'      },
  { id: 12,    label: '🗺️ Adventure'  },
  { id: 35,    label: '😆 Comedy'      },
  { id: 80,    label: '🔫 Crime'       },
  { id: 18,    label: '🎭 Drama'       },
  { id: 14,    label: '🧿 Fantasy'     },
  { id: 27,    label: '👻 Horror'      },
  { id: 878,   label: '🚀 Sci-Fi'      },
  { id: 53,    label: '🔪 Thriller'    },
  { id: 10749, label: '❤️ Romance'     },
  { id: 9648,  label: '🔍 Mystery'     },
  { id: 10751, label: '👨‍👩‍👧 Family'   },
  { id: 16,    label: '🎨 Animation'   },
  { id: 99,    label: '🎤 Documentary' },
  { id: 10402, label: '🎵 Music'       },
  { id: 37,    label: '🤠 Western'     },
]

const TONES = [
  { id: 'feelgood',   emoji: '🌟', label: 'Feel-Good & Fun',     desc: 'Light, uplifting, warm'  },
  { id: 'dark',       emoji: '🌑', label: 'Dark & Gritty',        desc: 'Raw, intense, edgy'      },
  { id: 'thoughtful', emoji: '🔬', label: 'Thought-Provoking',    desc: 'Deep, layered, artistic' },
  { id: 'intense',    emoji: '⚡', label: 'High-Octane Intense',  desc: 'Fast, visceral, explosive'},
]

const CONTENT_TYPES = [
  { id: 'movie', emoji: '🎬', label: 'Movies only',       desc: 'Feature films'              },
  { id: 'tv',    emoji: '📺', label: 'TV Shows only',     desc: 'Series & seasons'           },
  { id: '',      emoji: '🎯', label: 'Both equally',      desc: 'Give me the best of both'   },
]

const STEPS = [
  { id: 'mood',    title: 'What stories call to you?',         subtitle: 'Pick up to 5 vibes that excite you most'           },
  { id: 'era',     title: 'Your favourite film era?',           subtitle: 'All that apply — or all of them!'                  },
  { id: 'lang',    title: 'What languages do you watch in?',    subtitle: 'Select all you are comfortable with'                },
  { id: 'genres',  title: 'Fine-tune your genre taste',         subtitle: 'Pick any that you specifically enjoy'              },
  { id: 'tone',    title: 'What tone do you prefer?',           subtitle: 'Choose as many as feel right'                      },
  { id: 'type',    title: 'Movies or TV Shows?',                subtitle: 'We well weight your recommendations accordingly'     },
  { id: 'rate',    title: 'Quick taste test! 🎯',               subtitle: 'Tell us how you feel about these — skip unfamiliar' },
]

const TMDB_IMG = 'https://image.tmdb.org/t/p/w185'

// ── Reusable components ───────────────────────────────────────────────────────
const ProgressBar = ({ step, total }) => (
  <div className="flex gap-1.5 justify-center mb-5">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`h-1 rounded-full transition-all duration-500
        ${i < step  ? 'bg-primary/50 w-5' :
          i === step ? 'bg-primary w-8'   : 'bg-white/12 w-4'}`} />
    ))}
  </div>
)

const Pill = ({ active, onClick, children, className = '' }) => (
  <button onClick={onClick}
    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-200 select-none text-left
      ${active
        ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20 scale-[1.02]'
        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'}
      ${className}`}>
    {children}
  </button>
)

// ── Main Component ─────────────────────────────────────────────────────────────
export default function OnboardingModal({ onComplete }) {
  const [step, setStep]           = useState(0)
  const [moods, setMoods]         = useState([])
  const [eras, setEras]           = useState([])
  const [langs, setLangs]         = useState(['en'])
  const [selectedGenres, setGenres] = useState([])
  const [tones, setTones]         = useState([])
  const [contentType, setType]    = useState('')
  const [seedMovies, setSeedMovies] = useState([])
  const [seedRatings, setSeedRatings] = useState({})
  const [loadingMovies, setLoadingMovies] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const TOTAL_STEPS = STEPS.length

  // Fetch dynamic seed movies when user reaches the rating step
  useEffect(() => {
    if (step !== TOTAL_STEPS - 1) return
    const load = async () => {
      setLoadingMovies(true)
      try {
        const res = await api.get('/onboarding/seed-movies', {
          params: {
            moods:  moods.join(','),
            eras:   eras.join(','),
            genres: selectedGenres.join(','),
            tone:   tones.join(','),
            type:   contentType || '',
          },
        })
        setSeedMovies(res.data)
      } catch (err) {
        console.error('Seed movies error:', err)
        setSeedMovies([])
      } finally { setLoadingMovies(false) }
    }
    load()
  }, [step])

  const toggle = (list, setList, id, max = 10) => {
    setList(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < max ? [...prev, id] : prev
    )
  }

  const rateSeed = (id, verdict) => {
    setSeedRatings(prev => ({
      ...prev,
      [id]: prev[id] === verdict ? undefined : verdict,
    }))
  }

  const canNext = () => {
    if (step === 0) return moods.length > 0
    if (step === 1) return eras.length > 0
    if (step === 2) return langs.length > 0
    return true // genres, tone, type, rate all optional
  }

  const handleFinish = async () => {
    setSaving(true)
    setError('')
    try {
      const ratingMap = {}
      for (const [id, v] of Object.entries(seedRatings)) {
        if (v === 'liked')    ratingMap[id] = 9
        if (v === 'disliked') ratingMap[id] = 3
      }
      await api.post('/onboarding', {
        mood_preference:     moods,
        era_preference:      eras,
        language_preference: langs,
        preferred_genres:    selectedGenres,
        tone_preference:     tones,
        content_type:        contentType || null,
        seed_ratings:        ratingMap,
      })
      onComplete?.()
    } catch (err) {
      console.error(err)
      setError('Something went wrong, but your preference was noted.')
      setTimeout(() => onComplete?.(), 1500)
    } finally { setSaving(false) }
  }

  const currentStep = STEPS[step]

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0d0d18] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[92vh] flex flex-col">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-primary/15 to-purple-800/15 border-b border-white/8 px-6 pt-5 pb-4 text-center shrink-0">
          <p className="text-2xl mb-1">🎬</p>
          <h2 className="text-base font-black">{currentStep.title}</h2>
          <p className="text-gray-500 text-[11px] mt-0.5">{currentStep.subtitle}</p>
          <div className="mt-3">
            <ProgressBar step={step} total={TOTAL_STEPS} />
            <p className="text-[10px] text-gray-600">Step {step + 1} of {TOTAL_STEPS}</p>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">

          {/* Step 0: Mood */}
          {step === 0 && (
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map(m => (
                <Pill key={m.id} active={moods.includes(m.id)} onClick={() => toggle(moods, setMoods, m.id, 5)}>
                  <span className="block text-lg mb-0.5">{m.emoji}</span>
                  <span className="text-xs">{m.label}</span>
                </Pill>
              ))}
            </div>
          )}

          {/* Step 1: Era */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {ERAS.map(e => (
                <Pill key={e.id} active={eras.includes(e.id)} onClick={() => toggle(eras, setEras, e.id, 4)}>
                  <span className="block text-xl mb-1">{e.emoji}</span>
                  <span className="text-xs font-semibold">{e.label}</span>
                </Pill>
              ))}
            </div>
          )}

          {/* Step 2: Language */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-2">
              {LANGS.map(l => (
                <Pill key={l.id} active={langs.includes(l.id)} onClick={() => toggle(langs, setLangs, l.id, 12)}>
                  <span className="mr-1.5">{l.flag}</span>{l.label}
                </Pill>
              ))}
            </div>
          )}

          {/* Step 3: Explicit genres */}
          {step === 3 && (
            <>
              <p className="text-gray-500 text-xs mb-3">Optional — pick any you specifically enjoy</p>
              <div className="grid grid-cols-2 gap-2">
                {GENRE_OPTIONS.map(g => (
                  <Pill key={g.id} active={selectedGenres.includes(g.id)} onClick={() => toggle(selectedGenres, setGenres, g.id, 12)}>
                    {g.label}
                  </Pill>
                ))}
              </div>
            </>
          )}

          {/* Step 4: Tone */}
          {step === 4 && (
            <div className="grid grid-cols-2 gap-3">
              {TONES.map(t => (
                <Pill key={t.id} active={tones.includes(t.id)} onClick={() => toggle(tones, setTones, t.id, 4)}>
                  <span className="block text-2xl mb-1">{t.emoji}</span>
                  <span className="block text-xs font-bold">{t.label}</span>
                  <span className="block text-[10px] text-gray-500 mt-0.5">{t.desc}</span>
                </Pill>
              ))}
            </div>
          )}

          {/* Step 5: Content type */}
          {step === 5 && (
            <div className="grid grid-cols-1 gap-3">
              {CONTENT_TYPES.map(ct => (
                <Pill key={ct.id} active={contentType === ct.id} onClick={() => setType(ct.id)}
                  className="flex items-center gap-3 [&>span]:text-2xl">
                  <span className="text-2xl">{ct.emoji}</span>
                  <div>
                    <p className="font-semibold text-sm">{ct.label}</p>
                    <p className="text-[11px] text-gray-500">{ct.desc}</p>
                  </div>
                </Pill>
              ))}
            </div>
          )}

          {/* Step 6: Dynamic seed rating */}
          {step === 6 && (
            <>
              {loadingMovies ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <p className="text-gray-500 text-sm">Picking films for you…</p>
                </div>
              ) : seedMovies.length === 0 ? (
                <p className="text-center text-gray-500 py-10 text-sm">
                  Not many matching films in the library yet. You can rate movies directly from their detail pages!
                </p>
              ) : (
                <>
                  <p className="text-gray-500 text-[11px] mb-3">
                    {seedMovies.length} films based on your answers. ❤️ loved it · 👎 not for me · skip if unseen.
                  </p>
                  <div className="grid grid-cols-4 gap-2.5">
                    {seedMovies.map(m => {
                      const verdict = seedRatings[m.id]
                      return (
                        <div key={m.id} className="text-center">
                          <div className={`relative rounded-xl overflow-hidden border-2 transition-all mb-1
                            ${verdict === 'liked'    ? 'border-green-500 shadow-lg shadow-green-500/20' :
                              verdict === 'disliked' ? 'border-red-500 shadow-lg shadow-red-500/20'   :
                              'border-white/10 hover:border-white/25'}`}>
                            <img
                              src={m.poster_path ? `${TMDB_IMG}${m.poster_path}` : `https://placehold.co/185x278/1a1a2e/666?text=${encodeURIComponent(m.title.slice(0,10))}`}
                              alt={m.title}
                              className="w-full aspect-[2/3] object-cover"
                              loading="lazy"
                            />
                            {verdict && (
                              <div className={`absolute inset-0 flex items-center justify-center text-3xl
                                ${verdict === 'liked' ? 'bg-green-500/25' : 'bg-red-500/25'}`}>
                                {verdict === 'liked' ? '❤️' : '👎'}
                              </div>
                            )}
                          </div>
                          <p className="text-[9px] text-gray-400 line-clamp-1 mb-1">{m.title}</p>
                          <p className="text-[9px] text-gray-600 mb-1">{m.year}</p>
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => rateSeed(m.id, 'liked')}
                              className={`text-xs px-2 py-0.5 rounded-lg transition-colors
                                ${verdict === 'liked' ? 'bg-green-600 text-white' : 'bg-white/8 hover:bg-green-600/30'}`}>
                              ❤️
                            </button>
                            <button onClick={() => rateSeed(m.id, 'disliked')}
                              className={`text-xs px-2 py-0.5 rounded-lg transition-colors
                                ${verdict === 'disliked' ? 'bg-red-600 text-white' : 'bg-white/8 hover:bg-red-600/30'}`}>
                              👎
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {error && <p className="text-red-400 text-xs text-center mt-3">{error}</p>}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pb-5 pt-4 border-t border-white/8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)}
              className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-1">
              ← Back
            </button>
          ) : (
            <button onClick={() => onComplete?.()}
              className="text-gray-600 text-xs hover:text-gray-400 transition-colors">
              Skip for now
            </button>
          )}

          <div className="flex items-center gap-2">
            {/* Skip optional steps */}
            {step >= 3 && step < TOTAL_STEPS - 1 && (
              <button onClick={() => setStep(s => s + 1)}
                className="text-gray-500 text-xs hover:text-gray-300 transition-colors px-3 py-1.5">
                Skip
              </button>
            )}

            {step < TOTAL_STEPS - 1 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="btn-primary px-5 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                Continue →
              </button>
            ) : (
              <button onClick={handleFinish} disabled={saving || loadingMovies}
                className="btn-primary px-5 py-2 text-sm font-semibold disabled:opacity-50">
                {saving ? 'Building profile…' : '🚀 Build My Profile'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
