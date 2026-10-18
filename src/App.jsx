import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import './App.css'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import SeoManager from './components/SeoManager.jsx'
import { ArmyDraftProvider } from './features/generator/ArmyDraftContext.jsx'

const Home = lazy(() => import('./pages/Home.jsx'))
const Generador = lazy(() => import('./pages/Generador.jsx'))
const Reglamento = lazy(() => import('./pages/Reglamento.jsx'))
const DerechosAutor = lazy(() => import('./pages/DerechosAutor.jsx'))

function Layout() {
  return (
    <main className="app">
      <Nav />
      <ArmyDraftProvider><Outlet /></ArmyDraftProvider>
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
            {/* Coliseo se retiró: los enlaces antiguos van a Ejércitos, donde están los Héroes. */}
            <Route path="/coliseo" element={<Navigate to="/generador" replace />} />
            <Route path="/reglamento" element={<Reglamento />} />
            <Route path="/batalla" element={<Navigate to="/generador" replace />} />
            <Route path="/derechos-de-autor" element={<DerechosAutor />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
