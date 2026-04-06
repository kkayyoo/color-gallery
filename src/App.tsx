// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import ExtractPage from './pages/ExtractPage'
import GalleryPage from './pages/GalleryPage'
import Nav from './components/Nav'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<ExtractPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
