// src/components/Nav.tsx
import { NavLink } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="flex items-center gap-8 px-8 py-4 border-b border-surface-border bg-canvas/95 backdrop-blur-md sticky top-0 z-40">
      {/* Logo mark */}
      <div className="flex items-center gap-2.5">
        <div className="flex gap-0.5">
          <div className="w-2.5 h-2.5 rounded-full bg-brand" />
          <div className="w-2.5 h-2.5 rounded-full bg-brand-violet -ml-1 mt-1" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent-amber -ml-1" />
        </div>
        <span className="text-white font-semibold text-base tracking-tight">
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
                ? 'bg-surface-raised text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-surface-raised/50'
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
                ? 'bg-surface-raised text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-surface-raised/50'
            }`
          }
        >
          Gallery
        </NavLink>
      </div>
    </nav>
  )
}
