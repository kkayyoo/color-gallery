// src/components/Nav.tsx
import { NavLink } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="flex items-center gap-8 px-8 py-4 border-b border-gray-800 bg-gray-950">
      <span className="text-white font-bold text-lg tracking-tight">
        Color Collection
      </span>
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
        }
      >
        Extract
      </NavLink>
      <NavLink
        to="/gallery"
        className={({ isActive }) =>
          `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
        }
      >
        Gallery
      </NavLink>
    </nav>
  )
}
