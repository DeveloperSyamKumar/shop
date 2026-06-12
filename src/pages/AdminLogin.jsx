import { useState } from 'react'
import { ShoppingBag, Lock, AlertCircle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate small latency for realistic loading experience
    setTimeout(() => {
      const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
      if (password === correctPassword) {
        onLogin()
      } else {
        setError('Incorrect password. Please try again.')
        setIsLoading(false)
      }
    }, 600)
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-900 text-slate-100 overflow-hidden px-4">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Store</span>
        </Link>
      </div>

      <div className="relative w-full max-w-md bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-4 text-amber-500">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Bujji akka kirana kottu</h1>
          <p className="text-slate-400 text-sm mt-1">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2" htmlFor="password">
              Admin Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="password"
                type="password"
                className="w-full bg-slate-900/60 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white pl-10 pr-4 py-3 rounded-xl outline-none transition-all duration-200"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/60 text-slate-950 font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg shadow-amber-500/20"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}