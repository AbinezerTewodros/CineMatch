import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const [query, setQuery]  = useState('')
  const { user, logout }   = useAuth()
  const navigate           = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/discover?search=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <header className="glass border-b border-white/5 h-16 flex items-center px-6 gap-4 shrink-0">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies..."
            className="input pl-9 py-2 text-sm"
          />
        </div>
      </form>

      <div className="flex items-center gap-3 ml-auto">
        <div className="text-sm text-gray-400 hidden sm:block">
          Hi, <span className="text-white font-medium">{user?.username}</span>
        </div>
        <button
          onClick={() => { logout(); navigate('/') }}
          className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
