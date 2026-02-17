import { useNavigate } from 'react-router-dom'
import escaramuzaImg from '../images/imagen1.webp'
import escaramuzaImg2 from '../images/imagen2.webp'
import escaramuzaImg3 from '../images/imagen3.webp'

function Home() {
  const navigate = useNavigate()

  return (
    <>
      <header className="hero" id="landing">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow reveal">Wargame de miniaturas</p>
            <h1 className="reveal">ZEROLORE</h1>
            <p className="lead reveal">
              Tus miniaturas.
              <br />
              Tus historias.
              <br />
              Nuestra mesa.
            </p>
            <div className="hero-actions reveal">
              <button className="primary">Empezar a jugar</button>
              <button className="ghost" onClick={() => navigate('/reglamento')}>
                Ver reglas
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="section" id="escalas">
        <div className="section-head reveal">
          <p className="eyebrow">Escalas de juego</p>
          <h2>Tus minis. Tus reglas. Tu historia.</h2>
        </div>
        <div className="grid-three reveal">
          <article className="card card-scale-feature">
            <div className="card-scale-media" style={{ backgroundImage: `url(${escaramuzaImg})` }} />
            <div className="card-scale-content">
              <h3>Fácil de jugar</h3>
              <p>
                ZeroLore está diseñado para que puedas empezar en poco tiempo.
                <br />
                <br />
                Reglas claras.
                <br />
                Estructura coherente.
                <br />
                Sin necesidad de memorizar decenas de excepciones ni consultar el manual cada turno.
                <br />
                <br />
                Aprender es rápido.
                <br />
                Jugar es fluido.
              </p>
            </div>
          </article>
          <article className="card card-scale-feature card-scale-feature--reverse">
            <div className="card-scale-media" style={{ backgroundImage: `url(${escaramuzaImg2})` }} />
            <div className="card-scale-content">
              <h3>Escaramuzas o grandes batallas</h3>
              <p>
                ¿Pocas miniaturas y partidas rápidas? <strong>Modo escaramuza.</strong>
                <br />
                <br />
                ¿Grandes enfrentamientos con muchas unidades? <strong>Modo escuadras.</strong>
                <br />
                <br />
                El mismo reglamento funciona en ambas escalas, sin duplicar reglas ni complicar el sistema.
              </p>
            </div>
          </article>
          <article className="card card-scale-feature">
            <div
              className="card-scale-media"
              style={{ backgroundImage: `url(${escaramuzaImg3})`, backgroundPosition: '58% -140px', backgroundSize: '118%' }}
            />
            <div className="card-scale-content">
              <h3>Crea tus propias historias</h3>
              <p>
                ZeroLore no te impone un mundo ni un canon cerrado.
                <br />
                <br />
                Te ofrece facciones genéricas con estilos de juego distintos para que adaptes tus miniaturas al enfoque
                que prefieras: más táctico, más agresivo, más resistente o más estratégico.
                <br />
                <br />
                Usa tus minis. Construye tu propio universo. Cada partida puede ser un capítulo. Tú eres el creador
                de tus historias.
                <br />
                <br />
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="section contact" id="contacto">
        <div className="contact-grid reveal">
          <form className="contact-form">
            <label>
              Nombre
              <input type="text" placeholder="Tu nombre" />
            </label>
            <label>
              Email
              <input type="email" placeholder="tu@email.com" />
            </label>
            <label>
              Rol
              <select>
                <option>Playtester</option>
                <option>Artista conceptual</option>
                <option>Diseño narrativo</option>
                <option>Otro</option>
              </select>
            </label>
            <label>
              Mensaje
              <textarea rows="4" placeholder="Cuéntanos tu enfoque..." />
            </label>
            <button className="primary" type="submit">
              Enviar solicitud
            </button>
          </form>
          <div className="contact-panel">
            <h3>Canales activos</h3>
            <p>Discord, newsletter y sesiones privadas de prueba.</p>
            <div className="contact-list">
              <div>
                <span>Discord</span>
                <strong>Canal: zerolore-beta</strong>
              </div>
              <div>
                <span>Newsletter</span>
                <strong>Actualizaciones quincenales</strong>
              </div>
              <div>
                <span>Playtest</span>
                <strong>Madrid + remoto</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
