// src/components/Nav.tsx
import { NavLink } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function Nav() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <nav className="flex items-center gap-8 px-8 py-4 border-b border-surface-border bg-canvas/95 backdrop-blur-md sticky top-0 z-40">
      {/* Logo mark */}
      <div className="flex items-center gap-2.5">
        <div className="flex gap-0.5">
          <div className="w-2.5 h-2.5 rounded-full bg-brand" />
          <div className="w-2.5 h-2.5 rounded-full bg-brand-violet -ml-1 mt-1" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent-amber -ml-1" />
        </div>
        <span className="font-semibold text-base tracking-tight text-primary">
          Color Collection
        </span>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              isActive
                ? 'bg-surface-raised text-primary'
                : 'text-muted hover:text-secondary hover:bg-surface-raised/50'
            }`
          }
        >
          Extract
        </NavLink>
        <NavLink
          to="/gallery"
          className={({ isActive }) =>
            `px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              isActive
                ? 'bg-surface-raised text-primary'
                : 'text-muted hover:text-secondary hover:bg-surface-raised/50'
            }`
          }
        >
          Gallery
        </NavLink>
      </div>

      {/* Theme toggle — pushed to the right */}
      <div className="ml-auto">
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border border-surface-border text-secondary hover:text-primary hover:bg-surface-raised"
        >
          {isDark ? (
            /* Sun icon */
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            /* Moon icon */
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
            </svg>
          )}
          <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </nav>
  )
}
