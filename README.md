# ZeroLore Web

ZeroLore Web es una app para gestionar facciones, construir ejércitos y generar PDFs de roster listos para jugar. Incluye reglamento navegable, editor de unidades con modo escaramuza/escuadra, filtros por tipo de unidad y generador aleatorio por valor objetivo.

## Notes

- Requiere `node` y `npm`.
- Scripts: `npm run dev`, `npm run build`, `npm run lint`.
- Los PDFs de facciones viven en `src/data/pdfs` y sus datos en `src/data/*.json`.
- El generador usa esos JSON y el PDF exporta el roster para mesa.
