/**
 * Icono del set de armas (Asalto, Equilibrado, Disparo) para el Generador.
 * Son SVG en línea que heredan el color del texto, así siguen al estado de la
 * fila (apagado, activo) sin necesidad de una imagen por color.
 */
const PATHS = {
  asalto: (
    <>
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
    </>
  ),
  equilibrado: (
    <>
      <path d="M12 4v16" />
      <path d="M8 20h8" />
      <path d="M5 7h14" />
      <path d="M2 13 5 7l3 6a3 3 0 0 1-6 0Z" />
      <path d="M16 13l3-6 3 6a3 3 0 0 1-6 0Z" />
    </>
  ),
  disparo: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <line x1="12" y1="1.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22.5" y2="12" />
    </>
  ),
}

function RoleIcon({ roleId }) {
  const paths = PATHS[roleId]
  if (!paths) return null

  return (
    <svg
      className="unit-role-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths}
    </svg>
  )
}

export default RoleIcon
