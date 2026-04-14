import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import './App.css'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import SeoManager from './components/SeoManager.jsx'

const Home = lazy(() => import('./pages/Home.jsx'))
const Generador = lazy(() => import('./pages/Generador.jsx'))
const Reglamento = lazy(() => import('./pages/Reglamento.jsx'))

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
      <Suspense fallback={<main className="app"><Nav /><div className="section">Cargando...</div><Footer /></main>}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/generador" element={<Generador />} />
            <Route path="/reglamento" element={<Reglamento />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
