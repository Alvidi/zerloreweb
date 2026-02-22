import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import './App.css'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import SeoManager from './components/SeoManager.jsx'
import Home from './pages/Home.jsx'
import Generador from './pages/Generador.jsx'
import Reglamento from './pages/Reglamento.jsx'

function Layout() {
  return (
    <main className="app">
      <Nav />
      <Outlet />
      <Footer />
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <SeoManager />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/generador" element={<Generador />} />
          <Route path="/reglamento" element={<Reglamento />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
