# ZeroLore Web - Guia tecnica (para devs y agentes)

Este documento existe para que, aunque cambie el contexto o entre otro agente, se pueda continuar el trabajo sin romper el flujo del proyecto.

## 1) Arranque rapido

- Instalar deps: `npm install`
- Desarrollo: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`

SEO/Deploy:
- Definir `VITE_SITE_URL=https://tu-dominio.com` en Netlify para generar `canonical`, `robots.txt` y `sitemap.xml` absolutos.

## 2) Mapa del proyecto

- Pagina principal: `src/pages/Home.jsx`
- Reglamento: `src/pages/Reglamento.jsx`
- Generador: `src/pages/Generador.jsx`

Datos:
- Facciones ES: `src/data/factions/jsonFaccionesES/*.json`
- Facciones EN: `src/data/factions/jsonFaccionesEN/*.en.json`
- Reglamentos ES/EN: `src/data/spanish` y `src/data/english`

## 2.1) Arquitectura de reglamento (actual)

Archivos clave:
- Render y orquestacion: `src/pages/Reglamento.jsx`
- Textos fuente ES/EN: `src/data/spanish/*.md` y `src/data/english/*.md`
- Estilos de reglamento y galerias: `src/App.css`

Notas practicas:
- `Reglamento.jsx` renderiza Markdown y luego inserta galerias visuales dentro del HTML segun secciones concretas.
- Ahora mismo hay inserciones para doctrinas, puestos de mando, banderillas, activacion, estados y dano.
- Si cambia el texto de un heading o un parrafo clave en Notion/Markdown, revisar esos hooks.
- El PDF del reglamento tambien replica estas galerias, asi que cualquier insercion visual nueva debe revisarse en web y PDF.

## 3) Traducciones y UX

- Textos globales: `src/i18n/translations.js`
- Cualquier texto nuevo debe salir en ES/EN.

## 4) Checklist antes de cerrar cambios

- `npm run lint` pasa
- `npm run build` pasa

## 5) Convenciones practicas para no romper

- Cambios pequenos e incrementales (habilidad por habilidad).
- Evitar mezclar refactor + regla nueva grande en el mismo paso si no hace falta.
 - Si dudas del alcance de una regla, documentarlo aqui antes de codificar.

## 6) Protocolo obligatorio de traducciones y contenido

Regla:
- Si entra contenido nuevo en español (MD/JSON), hay que dejar tambien su par en ingles o marcar explicitamente que queda pendiente.

Nunca cerrar cambios de contenido "a medias" sin dejar trazabilidad.

## 7) Regla especial cuando Alberto pasa contenido nuevo

Asuncion por defecto:
- Alberto suele pasar contenido en español.

Comportamiento esperado del agente:
1. Actualizar contenido fuente en `src/data/...` (reglamentos `.md`, facciones `.json`).
2. Mantener paridad ES/EN del bloque modificado.
3. Revisar terminologia de juego (Save, Cover, Charge, etc.) para mantener consistencia.
4. Validar app (`lint`, `build`).

## 8) Definicion de "terminado"

Un cambio se considera terminado cuando:
- No rompe compilacion.
- Mantiene consistencia ES/EN.
- Queda documentado que scripts se ejecutaron y que validaciones pasaron.

## 9) Manera de trabajar (Alberto + IA)

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

## 10) Flujo operativo de contenido y traducciones

Esta seccion define el SOP obligatorio cuando Alberto pasa contenido nuevo (normalmente en espanol).

### 13.1 Regla principal

Cuando entra contenido nuevo en ES, el proyecto debe quedar consistente en:
- MD ES/EN (cuando aplique en reglamento)
- JSON ES/EN (cuando aplique en facciones)
- UI bilingue (labels y textos en `translations.js`)

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

Notas:
- Si una habilidad nueva no esta mapeada, anadirla en `weaponAbilities.js` segun corresponda.

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
