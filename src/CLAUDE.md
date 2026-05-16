# Memory — ZeroLore

## Proyecto
ZeroLore es un wargame de mesa gratuito y system-agnostic con 3 facciones (ORDEN, CAOS, LEGADO), cada una con versión Futuro y Pasado.
El proyecto tiene una web en React/JSX. El Notion es la fuente de verdad para el contenido del juego.

## Proyectos activos

| Nombre | Qué es |
|--------|--------|
| **batalla** | Simulador 1v1 en la web. Ver detalles: memory/projects/batalla.md |

→ Detalles completos: memory/projects/

## Términos del juego

| Término | Significado |
|---------|-------------|
| MOV | Movimiento (en pulgadas) |
| CaC | Cuerpo a Cuerpo |
| Salvación | Tirada defensiva (X+, ej. 4+) |
| Acometida | Movimiento de carga + ataque CaC gratis si llegas |
| Fichas de Reroll | 1 por jugador por fase de Iniciativa, para repetir dados |
| Escaramuza | Modo con miniaturas individuales |
| Gran Batalla | Modo con escuadras |
| Pasado / Futuro | Las dos eras de cada facción |
| Habilidades de facción | Gratuitas, el jugador elige 1 antes de la partida |

## Stack técnico

| Cosa | Detalle |
|------|---------|
| Framework | React + Vite |
| Router | React Router v6 |
| Datos ES | `data/factions/jsonFaccionesES/` |
| Especialidades | `utils/unitSpecialties.js` |
| Habilidades arma | `utils/weaponAbilities.js` |
| Páginas | Home, Generador, Reglamento, DerechosAutor |
| Notion ID Reglamento | 2eb087d9-4b33-800e-a112-ed9327b7e9c8 |
