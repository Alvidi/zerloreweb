function Home() {
  const features = [
    {
      title: 'Activaciones alternas',
      description:
        'Nunca esperas a que el rival termine su turno. La partida avanza de forma constante y dinámica.',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 7h6l-2.2-2.2L12 3l4.5 4.5L12 12l-1.2-1.8L13 8H7V7zm10 10h-6l2.2 2.2L12 21l-4.5-4.5L12 12l1.2 1.8L11 16h6v1z" />
        </svg>
      ),
    },
    {
      title: 'Reglas claras y ritmo rápido',
      description:
        'Diseñado para jugar, no para consultar el reglamento. Se entiende rápido y se recuerda fácil.',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 3l1.8 1.8L9.6 10H20v4H9.6l5.2 5.2L13 21 4 12 13 3z" />
        </svg>
      ),
    },
    {
      title: 'Profundo sin ser complejo',
      description:
        'Fácil de aprender. Difícil de dominar. La profundidad nace en la mesa, no en el libro.',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l9 5v10l-9 5-9-5V7l9-5zm0 3.2L6 7v6l6 3.3L18 13V7l-6-1.8z" />
        </svg>
      ),
    },
    {
      title: 'Sistema que escala sin romperse',
      description:
        'Funciona igual en escaramuza, escuadras, élite y vehículos. Mismas reglas, distinta escala.',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 18h4v-4H4v4zm6 0h4v-6h-4v6zm6 0h4V8h-4v10z" />
        </svg>
      ),
    },
    {
      title: 'Combate rápido y limpio',
      description:
        'Sin tiradas innecesarias ni tablas interminables. Impactas, resuelves y sigues jugando.',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      title: 'Wargame agnóstico',
      description:
        'Usa las miniaturas que quieras. No dependes de marcas, gamas ni universos cerrados.',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l4 4-4 4-4-4 4-4zm0 8l4 4-4 4-4-4 4-4zM2 12l4-4 4 4-4 4-4-4zm12 0l4-4 4 4-4 4-4-4z" />
        </svg>
      ),
    },
    {
      title: 'Historias creadas por los jugadores',
      description:
        'No hay lore obligatorio. Cada mesa cuenta su propia historia.',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 4h10a2 2 0 012 2v14l-5-3-5 3-5-3V6a2 2 0 012-2z" />
        </svg>
      ),
    },
    {
      title: 'Consulta rápida y clara',
      description:
        'Perfiles, armas y reglas pensadas para verse de un vistazo. Menos tiempo leyendo, más jugando.',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 4h9a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2zm2 4h6v2H8V8zm0 4h6v2H8v-2z" />
        </svg>
      ),
    },
  ]

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
              <button className="ghost">Ver reglas</button>
            </div>
          </div>
        </div>
      </header>

      <section className="section manifesto" id="manifiesto">
        <div className="section-head reveal">
          <p className="eyebrow">¿Qué es ZeroLore?</p>
          <h2>El manifiesto del juego.</h2>
        </div>
        <div className="manifesto-grid reveal">
          <article className="manifesto-card">
            <p>
              ZeroLore nace para devolver el protagonismo a la mesa. Para que las decisiones, el posicionamiento y el timing
              importen más que memorizar reglas o encadenar excepciones. Es un wargame diseñado para jugar con fluidez, donde
              cada turno avanza y cada elección deja huella.
            </p>
          </article>
          <article className="manifesto-card">
            <p>
              Es un sistema agnóstico, pensado para quienes aman las miniaturas y la estrategia, no las marcas ni los universos
              cerrados. Usa las minis que quieras, cuenta las historias que quieras y adapta el juego a tu grupo. ZeroLore no
              impone un relato: te da las herramientas para crear el tuyo.
            </p>
          </article>
          <article className="manifesto-card">
            <p>
              ZeroLore existe para ser sencillo sin ser superficial. Para entenderse de un vistazo, jugarse con naturalidad y
              crecer junto a la comunidad sin perder claridad. Menos tiempo leyendo reglas, más tiempo jugando con amigos
              alrededor de una mesa.
            </p>
          </article>
        </div>
      </section>

      <section className="section features" id="features">
        <div className="section-head reveal">
          <p className="eyebrow">Features de ZeroLore</p>
          <h2>Un sistema con identidad.</h2>
        </div>
        <div className="feature-grid reveal">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon" aria-hidden="true">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section contact" id="contacto">
        <div className="section-head reveal">
          <p className="eyebrow">Contacto</p>
          <h2>El proyecto está vivo. Suma tu voz.</h2>
          <p>
            Buscamos playtesters, artistas y estrategas para pulir la visión de ZeroLore.
          </p>
        </div>
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
