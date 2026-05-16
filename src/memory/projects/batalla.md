# Proyecto: Batalla (Simulador 1v1)

**Estado:** Pendiente de construir  
**Ruta web:** `/zona-batalla`  
**Archivo a crear:** `src/pages/ZonaBatalla.jsx`

## Qué es
Simulador de combate 1v1 dentro de la web de ZeroLore. Permite elegir dos unidades y resolver el combate siguiendo las reglas del reglamento, sin habilidades de facción.

## Flujo de usuario
1. Seleccionar unidad atacante (facción + era + nombre)
2. Seleccionar unidad defensora (facción + era + nombre)
3. Atacante elige arma — las armas con restricción de objetivo (ej. `Lanzacohetes (Vehículo, Monstruo)`) solo aparecen disponibles si el defensor es de esa clase
4. Pulsar **Atacar** → se resuelve todo paso a paso con dados visibles
5. Se actualiza la barra de Vidas del defensor
6. Botón **↔ Cambiar turno** (manual) para que el defensor ataque
7. Repetir hasta que una unidad llegue a 0 Vidas

## Reglas a implementar

### Resolución de ataque a distancia
- Tirar ataques dados → cada dado que alcanza el valor de impactos = hit
- 6 siempre = crítico (o X+ si el arma tiene Brutal X+)
- Directo: todos los dados impactan sin tirada de precisión

### Resolución CaC
- 1-2 = fallo, 3-5 = impacto, 6 = crítico (sin tirada de precisión)

### Defensa (por cada impacto)
- Defensor tira 1D6 vs Salvación (necesita igual o mayor)
- Impacto normal fallado → daño
- Crítico fallado → daño_critico
- Perforante + crítico → Salvación empeora en 1 para esa tirada

### Habilidades de arma activas
| Habilidad | Efecto |
|-----------|--------|
| Brutal X+ | Crítico en X+ en vez de solo 6 |
| Perforante | Críticos empeoran Salvación -1 |
| Directo | Sin tirada de precisión |
| Inestable | Tras atacar, tira 1D6: 1-2 = atacante recibe el mismo daño causado |
| Explosiva | Daño aplicado normalmente en 1v1 (sin splash relevante) |
| Multiuso | Se puede usar estando trabado (informativo) |
| Fiable | Sin efecto especial |
| Parabólica | Sin efecto especial en 1v1 |

### Especialidades activas en combate
| Especialidad | Cuándo aplica | Efecto |
|-------------|--------------|--------|
| Resistente | Defensor recibe daño | Primera vez por combate, reduce daño en 1D3 |
| Berserker | Defensor en CaC | Atacante falla en 1, 2 y 3 (en vez de solo 1-2) |
| Despiadado | Atacante en CaC | Críticos infligen +1 daño_critico |
| Devorador | Atacante en CaC | Al destruir al defensor, recupera 1D3 Vidas |
| Certero | Atacante a distancia | Opción "No se ha movido" → +1 a impactos |

### Especialidades ignoradas en 1v1
Guardia, Cobertura móvil, Terror, Capturador, Avanzadilla, Asentado, Tirador, Volador, Bloqueo de refuerzos, Porrazo, Soporte, Portaestandarte, Teletransporte, Anclado, Evasivo

## Estructura de archivos a crear
```
src/pages/ZonaBatalla.jsx          ← Página principal
src/features/batalla/
  combatEngine.js                  ← Toda la lógica de resolución
  UnitPicker.jsx                   ← Selector de unidades
  CombatArena.jsx                  ← Display del combate
```

## Datos
- Unidades de los 3 JSON ES: orden.json, caos.json, legado.json
- Salvación formato: ORDEN usa "X+", CAOS y LEGADO usan "+X" (mismo valor, parsear ambos)
- Restricciones de objetivo: parsear texto en paréntesis del nombre del arma
