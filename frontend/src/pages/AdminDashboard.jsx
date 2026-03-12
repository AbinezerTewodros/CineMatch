import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

// ── Tiny components ────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = 'primary' }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between mb-3">
      <span className="text-2xl">{icon}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
        ${color === 'green'  ? 'bg-green-900/30 text-green-400' :
          color === 'red'    ? 'bg-red-900/30 text-red-400'     :
          color === 'yellow' ? 'bg-yellow-900/30 text-yellow-400' :
          'bg-primary/15 text-primary'}`}>
        {sub}
      </span>
    </div>
    <p className="text-2xl font-black">{value?.toLocaleString()}</p>
    <p className="text-gray-500 text-xs mt-0.5">{label}</p>
  </div>
)

const Badge = ({ active, label }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold
    ${active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-red-400'}`} />
    {label}
  </span>
)

const Spinner = () => (
  <div className="flex justify-center py-16">
    <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  </div>
)

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function OverviewTab({ stats }) {
  if (!stats) return <Spinner />
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Total Users"         value={stats.users}       sub={`+${stats.new_today} today`}  color="primary" />
        <StatCard icon="⭐" label="Total Ratings"       value={stats.ratings}     sub="all time"                    color="yellow"  />
        <StatCard icon="🎬" label="Movies in DB"        value={stats.movies}      sub={`+ ${stats.tv_shows} shows`} color="green"   />
        <StatCard icon="📚" label="Watchlist Saves"     value={stats.watchlists}  sub="all time"                    color="primary" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🟢" label="Active This Week"    value={stats.active_week} sub="logged in"   color="green"   />
        <StatCard icon="🆕" label="New This Week"       value={stats.new_week}    sub="joined"      color="primary" />
        <StatCard icon="🚫" label="Banned Accounts"     value={stats.banned}      sub="suspended"   color="red"     />
        <StatCard icon="🛡️" label="Admins"             value={stats.admins}      sub="with access" color="yellow"  />
      </div>

      {/* Signup sparkline */}
      {stats.signup_trend?.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-400 mb-4">📈 New Signups — Last 7 Days</h3>
          <div className="flex items-end gap-2 h-20">
            {stats.signup_trend.map((d, i) => {
              const maxVal = Math.max(...stats.signup_trend.map(x => x.count), 1)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary/40 hover:bg-primary rounded-t transition-colors"
                    style={{ height: `${(d.count / maxVal) * 100}%`, minHeight: '4px' }}
                    title={`${d.day}: ${d.count} signups`} />
                  <span className="text-[9px] text-gray-600">
                    {new Date(d.day).toLocaleDateString('en', { weekday: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── USERS TAB ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(null) // { type, user }

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/users?q=${q}&page=${p}&limit=15`)
      setUsers(res.data.users)
      setTotal(res.data.total)
      setPage(p)
    } catch (_) {}
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load(1, search) }, [search])

  const handleAction = async (type, userId) => {
    try {
      if (type === 'ban')    await api.patch(`/admin/users/${userId}/ban`)
      if (type === 'role')   await api.patch(`/admin/users/${userId}/role`)
      if (type === 'delete') await api.delete(`/admin/users/${userId}`)
      load(page)
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed')
    }
    setConfirm(null)
  }

  const totalPages = Math.ceil(total / 15)

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-3 mb-5">
        <input
          placeholder="Search by username or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input flex-1 text-sm"
        />
        <span className="text-gray-500 text-sm">{total} users</span>
      </div>

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-gray-500 text-xs">
                <th className="text-left py-3 pr-4">User</th>
                <th className="text-left pr-4">Email</th>
                <th className="text-center pr-4">Ratings</th>
                <th className="text-center pr-4">Watchlist</th>
                <th className="text-center pr-4">Status</th>
                <th className="text-left pr-4">Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/3 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{u.avatar_emoji || '🎬'}</span>
                      <div>
                        <p className="font-medium">{u.username}</p>
                        {u.is_admin && <span className="text-[9px] text-yellow-400 bg-yellow-900/20 px-1 rounded">ADMIN</span>}
                      </div>
                    </div>
                  </td>
                  <td className="pr-4 text-gray-400 text-xs">{u.email}</td>
                  <td className="text-center pr-4 text-gray-300">{u.rating_count}</td>
                  <td className="text-center pr-4 text-gray-300">{u.watchlist_count}</td>
                  <td className="text-center pr-4">
                    <Badge active={!u.is_banned} label={u.is_banned ? 'Banned' : 'Active'} />
                  </td>
                  <td className="pr-4 text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setConfirm({ type: 'ban', user: u })}
                        className={`px-2 py-1 rounded text-[10px] font-medium transition-colors
                          ${u.is_banned
                            ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                            : 'bg-orange-900/30 text-orange-400 hover:bg-orange-900/50'}`}>
                        {u.is_banned ? 'Unban' : 'Ban'}
                      </button>
                      <button onClick={() => setConfirm({ type: 'role', user: u })}
                        className="px-2 py-1 rounded text-[10px] font-medium bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/40 transition-colors">
                        {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                      </button>
                      <button onClick={() => setConfirm({ type: 'delete', user: u })}
                        className="px-2 py-1 rounded text-[10px] font-medium bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button onClick={() => load(page - 1)} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm disabled:opacity-40">
            ←
          </button>
          <span className="text-gray-500 text-sm">{page} / {totalPages}</span>
          <button onClick={() => load(page + 1)} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm disabled:opacity-40">
            →
          </button>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0d0d18] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-lg mb-2">
              {confirm.type === 'delete' ? '⚠️ Delete User' :
               confirm.type === 'ban'    ? `${confirm.user.is_banned ? '✅ Unban' : '🚫 Ban'} User` :
               `${confirm.user.is_admin ? '⬇️ Revoke Admin' : '⬆️ Make Admin'}`}
            </h3>
            <p className="text-gray-400 text-sm mb-5">
              {confirm.type === 'delete'
                ? `This will permanently delete @${confirm.user.username} and all their data. This cannot be undone.`
                : confirm.type === 'ban'
                ? `${confirm.user.is_banned ? 'Restore access for' : 'Suspend'} @${confirm.user.username}?`
                : `${confirm.user.is_admin ? 'Remove admin privileges from' : 'Grant admin access to'} @${confirm.user.username}?`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleAction(confirm.type, confirm.user.id)}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors
                  ${confirm.type === 'delete' ? 'bg-red-600 hover:bg-red-700 text-white' :
                    confirm.type === 'ban' && !confirm.user.is_banned ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                    'bg-primary hover:bg-primary/80 text-white'}`}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CONTENT TAB ───────────────────────────────────────────────────────────────
function ContentTab() {
  const [content, setContent] = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [type, setType]       = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/content?q=${search}&type=${type}&page=${p}&limit=18`)
      setContent(res.data.content)
      setTotal(res.data.total)
      setPage(p)
    } catch (_) {}
    finally { setLoading(false) }
  }, [search, type])

  useEffect(() => { load(1) }, [search, type])

  const handleDelete = async (id, title) => {
    if (!confirm(`Remove "${title}" from the database?`)) return
    try {
      await api.delete(`/admin/content/${id}`)
      load(page)
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  const TMDB_IMG = 'https://image.tmdb.org/t/p/w185'
  const totalPages = Math.ceil(total / 18)

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <input placeholder="Search titles…" value={search}
          onChange={e => setSearch(e.target.value)} className="input flex-1 text-sm" />
        <select value={type} onChange={e => setType(e.target.value)}
          className="input w-32 text-sm">
          <option value="">All</option>
          <option value="movie">Movies</option>
          <option value="tv">TV Shows</option>
        </select>
        <span className="text-gray-500 text-sm shrink-0">{total} items</span>
      </div>

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {content.map(c => (
            <div key={c.id} className="group relative">
              <div className="rounded-xl overflow-hidden border border-white/10 aspect-[2/3]">
                <img
                  src={c.poster_path ? `${TMDB_IMG}${c.poster_path}` : `https://placehold.co/185x278/1a1a2e/666?text=${encodeURIComponent(c.title.slice(0,8))}`}
                  alt={c.title} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-end">
                  <button onClick={() => handleDelete(c.id, c.title)}
                    className="w-full opacity-0 group-hover:opacity-100 text-xs text-red-400 bg-red-900/80 py-1.5 font-medium transition-all">
                    🗑 Remove
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-gray-500 mt-1 line-clamp-1">{c.title}</p>
              <div className="flex gap-1 text-[9px] text-gray-600">
                <span>⭐{Number(c.vote_average).toFixed(1)}</span>
                <span>· 📚{c.watchlist_count}</span>
                <span>· ⭐{c.rating_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => load(page - 1)} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm disabled:opacity-40">←</button>
          <span className="text-gray-500 text-sm">{page} / {totalPages}</span>
          <button onClick={() => load(page + 1)} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm disabled:opacity-40">→</button>
        </div>
      )}
    </div>
  )
}

// ── ACTIVITY TAB ──────────────────────────────────────────────────────────────
function ActivityTab() {
  const [activity, setActivity] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get('/admin/activity')
      .then(r => setActivity(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="space-y-2">
      {activity.map((a, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
          <span className="text-xl">{a.avatar_emoji || (a.type === 'rating' ? '⭐' : '📚')}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{a.username}</span>
              {a.type === 'rating'
                ? <> rated <span className="text-gray-300">"{a.title}"</span> <span className="text-yellow-400 font-bold">{a.value}/10</span></>
                : <> saved <span className="text-gray-300">"{a.title}"</span> to watchlist</>}
            </p>
            <p className="text-[11px] text-gray-600">
              {new Date(a.created_at).toLocaleString()}
            </p>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full
            ${a.type === 'rating' ? 'bg-yellow-900/20 text-yellow-400' : 'bg-blue-900/20 text-blue-400'}`}>
            {a.type === 'rating' ? '⭐ Rating' : '📚 Watchlist'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── MAIN ADMIN DASHBOARD ──────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: '📊 Overview' },
  { id: 'users',     label: '👥 Users'    },
  { id: 'content',   label: '🎬 Content'  },
  { id: 'activity',  label: '📋 Activity' },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats]         = useState(null)

  // Redirect non-admins
  useEffect(() => {
    if (user && !user.is_admin) navigate('/discover')
    if (!user) navigate('/login')
  }, [user, navigate])

  // Load stats once
  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  if (!user?.is_admin) return null

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            🛡️ Admin Dashboard
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">System management — handle with care</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-yellow-900/10 border border-yellow-700/20 rounded-lg px-3 py-1.5">
          <span className="text-yellow-400">⚠️</span> Admin access
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'users'    && <UsersTab />}
        {activeTab === 'content'  && <ContentTab />}
        {activeTab === 'activity' && <ActivityTab />}
      </div>
    </div>
  )
}
