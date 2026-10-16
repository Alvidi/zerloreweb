import { Link } from 'react-router-dom'
import { useEffect, useId, useRef, useState } from 'react'
import homeEsMd from '../data/spanish/home.md?raw'
import { parseHomeContent } from '../utils/homeContent.js'
import heroImage from '../images/webimagen/home-worlds.webp'
import './Home.css'

const content = parseHomeContent(homeEsMd)
const pillars = ['agnostic', 'fast', 'universe']

function Arrow() {
  return <span aria-hidden="true">↗</span>
}

function WavingFlag({ paused }) {
  const svgRef = useRef(null)
  const id = useId().replace(/:/g, '')

  // SVG cloth deformation shares the scene's pause and reduced-motion settings.
  useEffect(() => {
    const svg = svgRef.current
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => {
      if (paused || preference.matches) svg.pauseAnimations()
      else svg.unpauseAnimations()
    }
    syncMotion()
    preference.addEventListener('change', syncMotion)
    return () => preference.removeEventListener('change', syncMotion)
  }, [paused])

  return (
    <svg ref={svgRef} className="landing-flag" viewBox="0 0 1672 941" aria-hidden="true" focusable="false">
      <defs>
        <filter id={`${id}-wind`} filterUnits="userSpaceOnUse" x="810" y="180" width="50" height="90">
          <feTurbulence type="fractalNoise" baseFrequency="0.025 0.035" numOctaves="1" seed="8" result="wind">
            <animate attributeName="baseFrequency" values="0.025 0.035;0.018 0.065;0.025 0.035" dur="5.8s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="wind" scale="6" xChannelSelector="R" yChannelSelector="G">
            <animate attributeName="scale" values="3;9;5;10;3" dur="5.8s" repeatCount="indefinite" />
          </feDisplacementMap>
        </filter>
        <filter id={`${id}-soft-edge`}><feGaussianBlur stdDeviation="1.4" /></filter>
        <mask id={`${id}-cloth`} maskUnits="userSpaceOnUse" x="810" y="180" width="50" height="90">
          <rect x="819" y="188" width="29" height="65" rx="4" fill="white" filter={`url(#${id}-soft-edge)`} />
        </mask>
      </defs>
      <image href={heroImage} width="1672" height="941" filter={`url(#${id}-wind)`} mask={`url(#${id}-cloth)`} />
    </svg>
  )
}

function Home() {
  const [motionPaused, setMotionPaused] = useState(false)

  return (
    <div className={`home-landing${motionPaused ? ' is-motion-paused' : ''}`}>
      <header className="landing-hero" id="landing">
        <div className="landing-hero-art" aria-hidden="true">
          <div className="landing-scene">
            <img src={heroImage} alt="" width="1672" height="941" fetchPriority="high" />
            <WavingFlag paused={motionPaused} />
            <div className="landing-sun-rays" />
            <div className="landing-sun-glow" />
            <div className="landing-magic-aura" />
            <div className="landing-magic-core" />
            <div className="landing-robot-shutter" />
            <div className="landing-robot-light" />
            <div className="landing-mist landing-mist-back" />
            <div className="landing-mist landing-mist-front" />
            <div className="landing-atmosphere">
              {Array.from({ length: 28 }, (_, index) => (
                <span
                  className="landing-ember"
                  key={index}
                  style={{
                    left: `${46 + (index * 17) % 51}%`,
                    bottom: `${8 + (index * 7) % 32}%`,
                    '--spark-size': `${2.4 + (index % 3) * 0.8}px`,
                    '--spark-drift': `${(index % 2 ? -1 : 1) * (16 + (index % 6) * 6)}px`,
                    '--spark-rise': `${95 + (index % 4) * 35}px`,
                    animationDuration: `${10 + (index % 6) * 1.7}s`,
                    animationDelay: `${index * -2.3}s`,
                  }}
                />
              ))}
              {Array.from({ length: 16 }, (_, index) => (
                <span
                  className="landing-spell-spark"
                  key={index}
                  style={{
                    left: `${65.4 + (index * 1.7) % 8}%`,
                    top: `${20 + (index % 5) * 2}%`,
                    '--spark-size': `${3.2 + (index % 3) * 0.8}px`,
                    '--spark-drift': `${(index % 2 ? -1 : 1) * 22}px`,
                    animationDelay: `${index * -0.65}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="eyebrow">{content.hero.eyebrow}</p>
            <h1>
              {content.hero.title}
              <span>{content.hero.title_accent}</span>
            </h1>
            <p className="landing-intro">{content.hero.subtitle}</p>
            <div className="landing-actions">
              <Link className="primary" to="/reglamento">
                {content.hero.primary_cta}<Arrow />
              </Link>
              <Link className="ghost" to="/generador">
                {content.hero.secondary_cta}
              </Link>
            </div>
            <p className="landing-free-note">
              <span aria-hidden="true">✦</span> {content.hero.note}
            </p>
          </div>
        </div>
        <button
          className="landing-motion-toggle"
          onClick={() => setMotionPaused((paused) => !paused)}
          aria-label={motionPaused ? content.hero.motion_play : content.hero.motion_pause}
          title={motionPaused ? content.hero.motion_play : content.hero.motion_pause}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
            {motionPaused ? <path d="M6 3.5 16 10 6 16.5Z" /> : <path d="M5 4h3v12H5zm7 0h3v12h-3z" />}
          </svg>
        </button>
      </header>

      <section className="section landing-pillars" id="pilares" aria-labelledby="pillars-title">
        <h2 className="eyebrow landing-section-label" id="pillars-title">{content.overview.title}</h2>
        <div className="landing-pillars-grid">
          {pillars.map((pillarKey, index) => (
            <article className="landing-pillar" key={pillarKey}>
              <span className="landing-pillar-index" aria-hidden="true">0{index + 1}</span>
              <h3>{content.pillars[pillarKey].title}</h3>
              <p>{content.pillars[pillarKey].body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section landing-start" id="explorar" aria-labelledby="start-title">
        <div className="landing-start-panel">
          <div className="landing-start-copy">
            <p className="eyebrow">{content.toolkit.eyebrow}</p>
            <h2 id="start-title">{content.toolkit.title}</h2>
            <p>{content.toolkit.body}</p>
          </div>
          <Link className="primary" to="/generador">{content.toolkit.cta}<Arrow /></Link>
        </div>
        <div className="landing-community" id="contacto">
          <div>
            <h2>{content.join.title}</h2>
            <p>{content.join.subtitle}</p>
          </div>
          <a className="landing-community-link" href="https://discord.gg/6ZMGUUTRQT" target="_blank" rel="noreferrer">
            {content.join.button}<Arrow />
          </a>
          <a className="landing-contact" href="mailto:zeroloretmg@gmail.com">{content.join.email_text}</a>
        </div>
      </section>
    </div>
  )
}

export default Home
