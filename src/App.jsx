import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, VereistLogin } from './lib/auth'
import Navbar from './components/Navbar'
import Start from './pages/Start'
import Home from './pages/Home'
import MijnBoekingen from './pages/MijnBoekingen'
import Admin from './pages/Admin'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pagina's zonder navbar */}
          <Route path="/start" element={<Start />} />
          {/* Beheerders loggen in via dezelfde code-login; oude links blijven werken */}
          <Route path="/admin/login" element={<Navigate to="/start" replace />} />

          {/* Pagina's met navbar, alleen na inloggen */}
          <Route path="/*" element={
            <VereistLogin>
              <Navbar />
              <main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/mijn-boekingen" element={<MijnBoekingen />} />
                  <Route path="/admin" element={<VereistLogin beheerder><Admin /></VereistLogin>} />
                </Routes>
              </main>
              <footer className="footer">
                <div className="footer-inner">
                  <span>© {new Date().getFullYear()} TEBI Bestratingsmaterialen</span>
                  <span>Vragen? Mail it@tebi.nl</span>
                </div>
              </footer>
            </VereistLogin>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
