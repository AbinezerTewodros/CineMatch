import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import ChatWidget from './ChatWidget'

// No sidebar — navigation lives in the Navbar hamburger dropdown
export default function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  )
}
