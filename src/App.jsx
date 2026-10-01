import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Start from './pages/Start'
import Home from './pages/Home'
import MijnBoekingen from './pages/MijnBoekingen'
import Admin from './pages/Admin'
import AdminLogin from './pages/AdminLogin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pagina's zonder navbar */}
        <Route path="/start" element={<Start />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Pagina's met navbar */}
        <Route path="/*" element={
          <>
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/mijn-boekingen" element={<MijnBoekingen />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>
            <footer className="footer">
              <div className="footer-inner">
                <span>© {new Date().getFullYear()} TEBI Bestratingsmaterialen</span>
                <span>Vragen? Mail it@tebi.nl</span>
              </div>
            </footer>
          </>
        } />
      </Routes>
    </BrowserRouter>
  )
}
