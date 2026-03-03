import { useState, useRef, useEffect } from 'react'
import api from '../lib/api'

const BotIcon  = () => <span className="text-lg">🤖</span>
const UserIcon = () => <span className="text-lg">👤</span>

export default function ChatWidget() {
  const [open, setOpen]       = useState(false)
  const [messages, setMsgs]   = useState([
    { role: 'assistant', content: 'Hi! 🎬 I\'m your AI movie guide. Ask me anything — "Recommend a sci-fi movie" or "Movies like Inception".' }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId]           = useState(() => crypto.randomUUID())
  const bottomRef             = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMsgs(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const { data } = await api.post('/chat', { message: userMsg, sessionId })
      setMsgs(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMsgs(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Sorry, I\'m having trouble connecting. Please try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-red-700 rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center text-2xl transition-all duration-200 hover:scale-110 active:scale-95 z-50"
        title="Chat with AI"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[520px] glass rounded-2xl border border-white/10 shadow-2xl z-50 flex flex-col animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-lg">🤖</div>
            <div>
              <p className="text-sm font-bold">CineAI</p>
              <p className="text-xs text-green-400">● Online</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="shrink-0 mt-1">
                  {msg.role === 'assistant' ? <BotIcon /> : <UserIcon />}
                </div>
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <BotIcon />
                <div className="chat-bubble-ai">
                  <span className="flex gap-1 py-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about movies..."
              className="input flex-1 py-2 text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              →
            </button>
          </form>
        </div>
      )}
    </>
  )
}
