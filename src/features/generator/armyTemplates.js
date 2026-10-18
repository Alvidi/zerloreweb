import { getUnidad, isHeroe } from './catalogUtils.js'
import objetosData from '../../data/items/objetos.json'

// Ejércitos de inicio: el azar elige una lista completa y coherente.
// La base repite perfiles y añade apoyos: 3, 4 y 5 tipos según el Valor.
// El Héroe y el Equipamiento se añaden a esos tipos de tropa.
export const ARMY_STYLES = [
  { id: "balanced", label: "Equilibrado", icon: "infantes", description: "Una línea de combate y otra de disparo.",
    variants: [
      {
        name: "Línea y cobertura",
        hero: "heroe-centinela",
        plan: "Los Infantes avanzan hacia los puestos y los Hostigadores los apoyan desde atrás. El Centinela ayuda a defender los puestos que ya controlas.",
        equipmentPlan: "La Bomba de humo evita un disparo enemigo. Guarda el Cargador extra para una activación en la que tus tiradores tengan un buen objetivo.",
        builds: {
          70: { units: [["infantes", 3], ["hostigadores", 3], ["asaltante", 2]], equipment: [["bomba-de-humo", 2], ["cargador-extra", 1]], supportPlan: "Los Asaltantes buscan flancos o puestos alejados." },
          150: { units: [["infantes", 5], ["hostigadores", 6], ["asaltante", 4], ["bastion", 3]], equipment: [["bomba-de-humo", 2], ["cargador-extra", 2]], supportPlan: "Los Asaltantes buscan flancos y los Bastiones refuerzan el fuego de la línea." },
          200: { units: [["infantes", 7], ["hostigadores", 6], ["asaltante", 4], ["bastion", 5], ["soporte", 2]], equipment: [["bomba-de-humo", 2], ["cargador-extra", 2]], supportPlan: "Los Asaltantes buscan flancos, los Bastiones refuerzan el fuego y los Soportes recuperan Vidas de aliados cercanos." },
        },
      },
      {
        name: "Avance protegido",
        hero: "heroe-guardian-campeon",
        plan: "Los Infantes disputan el frente y los Hostigadores dan apoyo a distancia. Mantén al Guardián cerca de la tropa que quieras proteger: puede recibir sus impactos.",
        equipmentPlan: "El Botiquín recupera Vidas a cambio de una activación. La Bomba de humo permite evitar un disparo cuando más lo necesitas.",
        builds: {
          70: { units: [["infantes", 3], ["hostigadores", 4], ["soporte", 1]], equipment: [["botiquin", 1], ["bomba-de-humo", 1]], supportPlan: "El Soporte puede recuperar Vidas del Guardián o de otra unidad cercana." },
          150: { units: [["infantes", 6], ["hostigadores", 7], ["soporte", 2], ["paladin", 3]], equipment: [["botiquin", 2], ["bomba-de-humo", 2]], supportPlan: "Los Paladines refuerzan el frente y los Soportes recuperan Vidas del Guardián o de otra unidad cercana." },
          200: { units: [["infantes", 6], ["hostigadores", 8], ["soporte", 2], ["paladin", 4], ["asaltante", 4]], equipment: [["botiquin", 3], ["bomba-de-humo", 2]], supportPlan: "Los Paladines refuerzan el frente, los Soportes recuperan Vidas y los Asaltantes alcanzan los puestos alejados de esta línea más lenta." },
        },
      },
    ],
  },
  { id: "shooting", label: "Disparo", icon: "hostigadores", description: "Apoya a tus tropas y concentra el fuego.",
    variants: [
      {
        name: "Objetivo marcado",
        hero: "heroe-cazadora-furtiva",
        plan: "Dispara primero con la Cazadora para marcar un objetivo. Los Hostigadores disputan puestos y dan pie al Fuego de apoyo de Armas Pesadas si están a 6″ o menos. Armas Pesadas no aporta Valor al control de puestos.",
        equipmentPlan: "El Cargador extra permite disparar dos veces en una activación. La Bomba de humo protege a tus tiradores de un disparo enemigo.",
        builds: {
          70: { units: [["hostigadores", 4], ["armas-pesadas", 2], ["bastion", 1]], equipment: [["cargador-extra", 1], ["bomba-de-humo", 1]], supportPlan: "El Bastión refuerza la defensa de los puestos y puede responder al fuego enemigo." },
          150: { units: [["hostigadores", 8], ["armas-pesadas", 4], ["bastion", 3], ["explorador", 2]], equipment: [["cargador-extra", 2], ["bomba-de-humo", 2]], supportPlan: "Los Bastiones sostienen los puestos y los Exploradores se adelantan para disputar otros. Los Exploradores actúan individualmente." },
          200: { units: [["hostigadores", 8], ["armas-pesadas", 4], ["bastion", 4], ["explorador", 2], ["artilleria", 2]], equipment: [["cargador-extra", 3], ["bomba-de-humo", 3]], supportPlan: "Los Bastiones sostienen los puestos y los Exploradores se adelantan individualmente. La Artillería aporta fuego desde retaguardia: no puede moverse ni aporta Valor a los puestos." },
        },
      },
      {
        name: "Tomar y defender",
        hero: "heroe-centinela",
        plan: "Los Exploradores se adelantan para disputar puestos. Los Hostigadores llegan después para sostenerlos con el apoyo del Centinela. Los Exploradores siempre actúan individualmente.",
        equipmentPlan: "El Cargador extra refuerza una activación de disparo. Las Bombas de humo ayudan a conservar las tropas que están ocupando los puestos.",
        builds: {
          70: { units: [["hostigadores", 4], ["explorador", 2], ["bastion", 2]], equipment: [["cargador-extra", 1], ["bomba-de-humo", 1]], supportPlan: "Los Bastiones refuerzan la defensa de los puestos conquistados." },
          150: { units: [["hostigadores", 7], ["explorador", 4], ["bastion", 4], ["vehiculo-ligero", 2]], equipment: [["cargador-extra", 2], ["bomba-de-humo", 2]], supportPlan: "Los Bastiones refuerzan la defensa y los Vehículos ligeros aportan fuego y Transporte. Los vehículos no aportan Valor a los puestos." },
          200: { units: [["hostigadores", 8], ["explorador", 4], ["bastion", 4], ["vehiculo-ligero", 3], ["armas-pesadas", 3]], equipment: [["cargador-extra", 2], ["bomba-de-humo", 2]], supportPlan: "Los Bastiones refuerzan la defensa y los Vehículos ligeros aportan fuego y Transporte. Coloca Armas Pesadas a 6″ o menos de tus tiradores para aprovechar Fuego de apoyo. Los vehículos y Armas Pesadas no aportan Valor a los puestos." },
        },
      },
    ],
  },
  { id: "assault", label: "Asalto", icon: "asaltante", description: "Avanza hacia los puestos y pelea de cerca.",
    variants: [
      {
        name: "Primera línea",
        hero: "heroe-gran-caudillo",
        plan: "Los Infantes avanzan por el centro y aprovechan la mejora a las cargas de Soldados del Gran Caudillo. Los Asaltantes usan su movilidad para atacar desde otro ángulo o disputar un puesto.",
        equipmentPlan: "La Bomba de humo ayuda a acercarte evitando un disparo. El Potenciador añade dados al ataque que necesite un empujón.",
        builds: {
          70: { units: [["infantes", 3], ["asaltante", 2], ["paladin", 1]], equipment: [["bomba-de-humo", 2], ["potenciador", 1]], supportPlan: "El Paladín puede atraer a un enemigo con Cadena para atacarlo de cerca. La mejora del Caudillo solo afecta a Soldados." },
          150: { units: [["infantes", 6], ["asaltante", 4], ["paladin", 3], ["monstruo", 1]], equipment: [["bomba-de-humo", 3], ["potenciador", 2]], supportPlan: "Los Paladines refuerzan el frente y el Monstruo abre paso. El Monstruo no aporta Valor a los puestos; la mejora del Caudillo solo afecta a Soldados." },
          200: { units: [["infantes", 7], ["asaltante", 5], ["paladin", 3], ["monstruo", 2], ["soporte", 2]], equipment: [["bomba-de-humo", 3], ["potenciador", 3]], supportPlan: "Los Paladines refuerzan el frente, los Monstruos abren paso y los Soportes recuperan Vidas de aliados cercanos. Los Monstruos no aportan Valor a los puestos; la mejora del Caudillo solo afecta a Soldados." },
        },
      },
      {
        name: "Acero en marcha",
        hero: "heroe-maestro-de-esgrima",
        plan: "Infantes y Paladines avanzan hacia los puestos. El Maestro mejora su Defensa frente al disparo porque no tienen arma a distancia. Usa a los Paladines para los enfrentamientos más duros.",
        equipmentPlan: "Las Bombas de humo protegen el avance. Guarda el Potenciador para una carga con la que puedas disputar un puesto.",
        builds: {
          70: { units: [["infantes", 2], ["paladin", 2], ["soporte", 1]], equipment: [["bomba-de-humo", 2], ["potenciador", 2]], supportPlan: "El Soporte puede recuperar Vidas del Maestro o de otra unidad cercana." },
          150: { units: [["infantes", 6], ["paladin", 3], ["soporte", 2], ["monstruo", 2]], equipment: [["bomba-de-humo", 2], ["potenciador", 2]], supportPlan: "Los Soportes recuperan Vidas y los Monstruos también aprovechan la protección del Maestro frente al disparo. Los Monstruos no aportan Valor a los puestos." },
          200: { units: [["infantes", 6], ["paladin", 4], ["soporte", 2], ["monstruo", 3], ["asaltante", 2]], equipment: [["bomba-de-humo", 3], ["potenciador", 3]], supportPlan: "Los Soportes recuperan Vidas y los Monstruos abren paso, aunque no aportan Valor a los puestos. Los Asaltantes buscan flancos; como llevan arma a distancia, no reciben la mejora de Defensa del Maestro." },
        },
      },
    ],
  },
  { id: "vehicles", label: "Vehículos", icon: "vehiculo-ligero", description: "Blindados y una tropa para conquistar puestos.",
    variants: [
      {
        name: "Convoy de apoyo",
        hero: "heroe-centinela",
        plan: "Los Vehículos ligeros aportan fuego y pueden desplegar tropas con Transporte. Los Hostigadores y el Centinela se encargan de los puestos: los vehículos no aportan Valor a su control y actúan individualmente.",
        equipmentPlan: "El Botiquín permite recuperar Vidas de un vehículo o de otra unidad a cambio de una activación. Guarda la Bomba de humo para evitar un disparo peligroso.",
        builds: {
          70: { units: [["vehiculo-ligero", 2], ["hostigadores", 4], ["soporte", 1]], equipment: [["botiquin", 1], ["bomba-de-humo", 1]], supportPlan: "El Soporte puede reparar un vehículo o recuperar Vidas de otra unidad cercana; también aporta Valor a los puestos." },
          150: { units: [["vehiculo-ligero", 3], ["hostigadores", 7], ["soporte", 2], ["vehiculo-pesado", 2]], equipment: [["botiquin", 2], ["bomba-de-humo", 2]], supportPlan: "Los Vehículos pesados refuerzan el fuego y los Soportes pueden reparar los blindados. Los Soportes también aportan Valor a los puestos." },
          200: { units: [["vehiculo-ligero", 3], ["hostigadores", 7], ["soporte", 2], ["vehiculo-pesado", 3], ["infantes", 4]], equipment: [["botiquin", 3], ["bomba-de-humo", 3]], supportPlan: "Los Vehículos pesados refuerzan el fuego y los Soportes reparan a los aliados. Los Infantes pueden salir con Transporte y disputar puestos de cerca. Tanto Infantes como Soportes aportan Valor a los puestos." },
        },
      },
      {
        name: "Columna blindada",
        hero: "heroe-centinela",
        plan: "Los Vehículos pesados cubren el avance con sus armas. Protege a los Hostigadores y al Centinela: aportan Valor a los puestos. Los vehículos siempre actúan individualmente.",
        equipmentPlan: "El Botiquín recupera Vidas a cambio de una activación. Las Bombas de humo permiten evitar un disparo contra una pieza importante.",
        builds: {
          70: { units: [["vehiculo-pesado", 1], ["hostigadores", 4], ["vehiculo-ligero", 1]], equipment: [["botiquin", 1], ["bomba-de-humo", 1]], supportPlan: "El Vehículo ligero añade movilidad y Transporte para desplegar tropas." },
          150: { units: [["vehiculo-pesado", 3], ["hostigadores", 7], ["vehiculo-ligero", 1], ["bastion", 2]], equipment: [["botiquin", 2], ["bomba-de-humo", 2]], supportPlan: "El Vehículo ligero facilita el despliegue con Transporte. Los Bastiones acompañan a los Hostigadores y también aportan Valor a los puestos." },
          200: { units: [["vehiculo-pesado", 2], ["hostigadores", 6], ["vehiculo-ligero", 3], ["bastion", 2], ["titan", 1]], equipment: [["botiquin", 3], ["bomba-de-humo", 3]], supportPlan: "El Titán concentra el fuego y los Vehículos ligeros facilitan el despliegue con Transporte. Conserva a los Hostigadores y Bastiones para conquistar puestos: el Titán tampoco aporta Valor a su control." },
        },
      },
    ],
  },
]
export const TEMPLATE_BUDGETS = [70, 150, 200]
const UNIT_TYPES_BY_BUDGET = { 70: 3, 150: 4, 200: 5 }

const EQUIPMENT_BY_ID = new Map(objetosData.objetos.map((item) => [item.id, item]))
const hasCost = (value) => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
const validCount = (count) => Number.isInteger(count) && count > 0
const compositionKey = (counts) => [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([id, count]) => `${id}:${count}`).join('|')

function resolveComposition(variant, budget) {
  const build = variant.builds[budget]
  if (!build) return null
  const counts = new Map()
  for (const [id, count] of [[variant.hero, 1], ...build.units]) {
    if (!validCount(count)) return null
    counts.set(id, (counts.get(id) || 0) + count)
  }
  const units = [...counts].map(([id, count]) => ({ unit: getUnidad(id), count }))
  if (units.some(({ unit }) => !unit || !hasCost(unit.perfil.valor))) return null
  if (units.filter(({ unit }) => !isHeroe(unit.id)).length !== UNIT_TYPES_BY_BUDGET[budget]) return null

  const equipmentCounts = new Map()
  for (const [id, count] of build.equipment) {
    if (!validCount(count)) return null
    equipmentCounts.set(id, (equipmentCounts.get(id) || 0) + count)
  }
  const equipment = [...equipmentCounts].map(([id, count]) => ({ item: EQUIPMENT_BY_ID.get(id), count }))
  if (!equipment.length || equipment.some(({ item }) => !item || !hasCost(item.valor))) return null

  const unitTotal = units.reduce((sum, { unit, count }) => sum + Number(unit.perfil.valor) * count, 0)
  const equipmentTotal = equipment.reduce((sum, { item, count }) => sum + Number(item.valor) * count, 0)
  const total = unitTotal + equipmentTotal
  const heroes = units.filter(({ unit }) => isHeroe(unit.id))
  // Un cambio de catálogo nunca permite cargar una lista incompleta,
  // sin equipo, con varios Héroes o por encima del presupuesto.
  if (total > budget || heroes.length !== 1 || heroes[0].count !== 1 || heroes[0].unit.habilidad === 'Todo para uno') return null
  const scoresHeavy = heroes[0].unit.habilidad === 'Victoria sobre ruedas'
  const scoringCount = units.reduce((n, { unit, count }) => {
    const role = (unit.rol || '').split(',').at(-1).trim()
    return n + ((role !== 'Fuego pesado' && (role !== 'Pesado' || scoresHeavy)) ? count : 0)
  }, 0)
  if (scoringCount < 2) return null
  const key = `${compositionKey(counts)};equipment:${compositionKey(equipmentCounts)}`
  return { name: variant.name, plan: [variant.plan, build.supportPlan].filter(Boolean).join(' '), equipmentPlan: variant.equipmentPlan,
    units, equipment, unitTotal, equipmentTotal, total, key, budget }
}

export function getArmyTemplates(styleId, budget) {
  const style = ARMY_STYLES.find((candidate) => candidate.id === styleId)
  if (!style || !TEMPLATE_BUDGETS.includes(budget)) return []
  const proposals = style.variants.map((variant) => resolveComposition(variant, budget)).filter(Boolean)
  return [...new Map(proposals.map((proposal) => [proposal.key, proposal])).values()]
}
