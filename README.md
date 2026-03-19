# ZeroLore Web

ZeroLore Web es la plataforma oficial para preparar partidas de ZeroLore de forma rápida, visual y sin fricción.  
La web reúne creación de listas, consulta de reglamento y resolución de combates en una sola experiencia pensada para jugar mejor en mesa.

## Que ofrece

- Constructor de ejercitos por faccion con flujo rapido para Escaramuza y Escuadra.
- Seleccion de unidades y armas con interfaz clara para preparar listas en pocos minutos.
- Exportacion a PDF lista para imprimir o llevar en movil durante la partida.
- Reglamento navegable integrado (ES/EN) para consultar reglas sin salir de la web.
- Simulador de batalla con atacante/defensor, seleccion de cobertura, resolucion paso a paso y registro de tiradas.
- Herramientas de prueba como seleccion aleatoria de faccion, unidad y arma para testear combinaciones.
- Diseño responsive para usar en escritorio o movil durante la partida.

## Objetivo del proyecto

Hacer que ZeroLore sea mas accesible, agilizando decisiones de juego y reduciendo tiempo entre preparacion y accion en mesa.

## Stack

- React + Vite
- CSS propio
- Datos de facciones y reglamentos en JSON/HTML

## Desarrollo local

Requisitos:

- `node`
- `npm`

Comandos:

- `npm run dev`
- `npm run build`
- `npm run lint`

## Estructura de datos (resumen)

- Facciones ES: `src/data/factions/jsonFaccionesES/*.json`
- Facciones EN: `src/data/factions/jsonFaccionesEN/*.en.json`
- Reglamento ES/EN: `src/data/spanish` y `src/data/english`

## Documentacion tecnica (importante)

Si trabajas en codigo de batalla o entra otro agente/dev al proyecto, leer primero:

- `AGENTS.md`
- `docs/DEVELOPMENT_GUIDE.md`
