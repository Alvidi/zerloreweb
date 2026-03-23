# ZeroLore Web - Guia tecnica (para devs y agentes)

Este documento existe para que, aunque cambie el contexto o entre otro agente, se pueda continuar el trabajo sin romper el flujo del proyecto.

## 1) Arranque rapido

- Instalar deps: `npm install`
- Desarrollo: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Smoke test combate: `npm run battle:smoke`

## 2) Mapa del proyecto

- Pagina principal: `src/pages/Home.jsx`
- Reglamento: `src/pages/Reglamento.jsx`
- Generador: `src/pages/Generador.jsx`
- Batalla (orquestacion UI + estado): `src/pages/Batalla.jsx`

Datos:
- Facciones ES: `src/data/factions/jsonFaccionesES/*.json`
- Facciones EN: `src/data/factions/jsonFaccionesEN/*.en.json`
- Reglamentos ES/EN: `src/data/spanish` y `src/data/english`

## 3) Arquitectura de batalla (actual)

Archivos clave:
- Motor de combate puro: `src/utils/battleEngine.js`
- Habilidades de faccion (catalogo + condiciones + log): `src/features/battle/factionAbilities.js`
- Habilidades de arma (ids/parsing): `src/features/battle/weaponAbilities.js`
- Utilidades de batalla (normalizacion, picks, keys): `src/features/battle/battleUtils.js`
- Builders de entradas de log: `src/features/battle/battleLogEntries.js`
- Render del registro de combate: `src/features/battle/components/BattleCombatLog.jsx`
- Hooks para futuro (cantidad minis, especialidades): `src/features/battle/battleFutureHooks.js`

Regla de oro:
- `battleEngine.js` debe seguir siendo lo mas puro posible (input -> output), sin depender de React.
- `Batalla.jsx` orquesta estado y llama al motor, pero evita meter toda la logica de reglas ahi.

## 4) Orden de resolucion acordado

Pipeline de combate:
1. Leer stats base (unidad + arma)
2. Aplicar especialidad de unidad (si modifica combate)
3. Aplicar habilidades de faccion
4. Aplicar habilidades de arma
5. Tirar dados
6. Aplicar cobertura
7. Calcular dano final y vidas restantes
8. Si hay contraataque, repetir mismo pipeline

Nota:
- Este orden se usa como referencia para implementar nuevas reglas.

## 5) Como anadir una nueva habilidad de faccion

1. Mapear nombre -> `effectKey` en `factionAbilities.js` (`nameTokens`).
2. Si altera calculo, anadir bandera en `buildFactionAttackConditions(...)`.
3. Consumir esa bandera en `battleEngine.js` y registrar la regla en `rulesApplied`.
4. Anadir detalle de log en `buildLogDetail(...)` para que el usuario vea que paso.
5. Si es "una vez por turno/resolucion", controlar su consumo en `Batalla.jsx` (ejemplo: mapas por lado dentro de `handleResolve`).
6. Verificar en UI y en `battle:smoke` cuando aplique.

## 6) Traducciones y UX

- Textos de batalla: `src/features/battle/battleTranslations.js`
- Textos globales: `src/i18n/translations.js`
- Cualquier texto nuevo debe salir en ES/EN.
- En el log de combate, mostrar resultados utiles y directos (evitar ruido redundante).

## 7) Checklist antes de cerrar cambios

- `npm run lint` pasa
- `npm run build` pasa
- `npm run battle:smoke` pasa (si tocaste combate)
- Revisar que no se duplican lineas de habilidad en el log
- Revisar que el orden visual del registro sigue claro (ataque -> habilidades -> defensa -> resultado)

## 8) Convenciones practicas para no romper

- Cambios pequenos e incrementales (habilidad por habilidad).
- Evitar mezclar refactor + regla nueva grande en el mismo paso si no hace falta.
- Si una habilidad no afecta combate, dejarla fuera del motor por ahora.
- Si dudas del orden de aplicacion, documentarlo aqui antes de codificar.

## 9) Protocolo obligatorio de traducciones y contenido

Regla:
- Si entra contenido nuevo en español (MD/JSON), hay que dejar tambien su par en ingles o marcar explicitamente que queda pendiente.

Nunca cerrar cambios de contenido "a medias" sin dejar trazabilidad.

## 10) Regla especial cuando Alberto pasa contenido nuevo

Asuncion por defecto:
- Alberto suele pasar contenido en español.

Comportamiento esperado del agente:
1. Actualizar contenido fuente en `src/data/...` (reglamentos `.md`, facciones `.json`).
2. Mantener paridad ES/EN del bloque modificado.
3. Revisar terminologia de juego (Save, Cover, Charge, etc.) para mantener consistencia.
4. Validar app (`lint`, `build`, y `battle:smoke` si toca combate).

## 11) Definicion de "terminado"

Un cambio se considera terminado cuando:
- No rompe compilacion.
- No rompe combate.
- Mantiene consistencia ES/EN.
- Queda documentado que scripts se ejecutaron y que validaciones pasaron.

## 12) Manera de trabajar (Alberto + IA)

Este proyecto se mantiene con un flujo incremental y muy controlado.

Reglas de colaboracion:
- Implementar una cosa cada vez (habilidad por habilidad, ajuste por ajuste).
- No meter cambios grandes "de golpe" sin validar en pasos intermedios.
- Si hay ambiguedad de reglas, parar y confirmar antes de asumir logica nueva.
- Priorizar claridad del log de combate sobre texto redundante.
- Mantener siempre paridad ES/EN en contenido y traducciones.
- Al cerrar cada bloque, dejar trazabilidad:
  - que se toco
  - por que
  - como se valido

Convencion de entrega recomendada:
1. Resumen corto de cambios
2. Archivos tocados
3. Validaciones ejecutadas
4. Pendientes claros (si existen)

## 13) Flujo operativo de contenido y traducciones

Esta seccion define el SOP obligatorio cuando Alberto pasa contenido nuevo (normalmente en espanol).

### 13.1 Regla principal

Cuando entra contenido nuevo en ES, el proyecto debe quedar consistente en:
- MD ES/EN (cuando aplique en reglamento)
- JSON ES/EN (cuando aplique en facciones)
- UI bilingue (labels y textos en `translations.js` y `battleTranslations.js`)

Nunca cerrar cambios con solo un idioma actualizado si el feature ya existe en ambos.

### 13.2 Caso A: Alberto pasa datos de facciones (normalmente ES)

Objetivo:
- Actualizar `jsonFaccionesES`
- Mantener `jsonFaccionesEN` alineado
- Validar que el juego no se rompe

Pasos:
1. Actualizar JSON ES en `src/data/factions/jsonFaccionesES/*.json`.
2. Reflejar cambios equivalentes en EN (`src/data/factions/jsonFaccionesEN/*.en.json`).
3. Revisar calidad de nombres EN (armas/unidades/habilidades) y corregir traducciones raras.
4. Validar app:
   - `npm run lint`
   - `npm run build`
   - `npm run battle:smoke` (si toca combate)

Notas:
- Si una habilidad nueva no esta mapeada, anadirla en `weaponAbilities.js` o `factionAbilities.js` segun corresponda.

### 13.3 Caso B: Alberto pasa reglamento (ES)

Objetivo:
- ES y EN alineados por secciones
- Tabla de contenidos coherente

Pasos recomendados:
1. Actualizar `.md` ES en `src/data/spanish/`.
2. Actualizar su equivalente EN en `src/data/english/`.
3. Revisar TOC/render final en `Reglamento.jsx`.
4. Validar app:
   - `npm run lint`
   - `npm run build`

Regla:
- No hacer traduccion ciega. Revisar terminos de juego (Save, Cover, Charge, etc.) para mantener consistencia.

### 13.4 Checklist de paridad ES/EN

Antes de cerrar:
- Existe version ES y EN del contenido tocado.
- Los mismos bloques/entidades existen en ambos lados.
- Naming consistente con el resto del juego.
- No se han perdido IDs o estructura.

### 13.5 Donde se rompen cosas normalmente

- Traducciones automaticas literales en habilidades (cambian sentido de regla).
- Cambios en un solo idioma.
- Nombres de habilidad no mapeados al `effectKey`.
- No ejecutar auditoria tras sync de reglamento.
