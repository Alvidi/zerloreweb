# Reglamento ZeroLore

ZeroLore está diseñado para ser flexible, modular y adaptable. Si es la primera vez que juegas, empieza por hacerte con las bases de las unidades antes de saltar a armas y habilidades de unidades, y ve añadiendo estos conceptos a medida que te familiarices con el juego.

**Este reglamento proporciona una base sólida, pero los jugadores son libres de crear escenarios, campañas y reglas adicionales manteniendo la estructura fundamental del sistema.**

---

# Conceptos fundamentales

Antes de comenzar a jugar, es importante aclarar algunos conceptos básicos que se utilizan a lo largo de todo el reglamento. ZeroLore utiliza un lenguaje sencillo y directo, pero estas definiciones evitan confusiones durante la partida.

## Miniaturas, unidades y escuadras

Una **miniatura** representa a un combatiente individual, criatura o vehículo en el campo de batalla.

Una **unidad** es el elemento básico de activación del juego. Puede ser una miniatura en solitario o una escuadra.

Una **escuadra** es un **Comandante** acompañado de varias miniaturas del mismo tipo de unidad, que comparten activación, acciones y objetivos. Aunque las miniaturas puedan portar armas distintas, todas forman parte de la misma unidad a efectos de reglas. Solo los Comandantes pueden formar escuadras *(ver Comandantes y escuadras)*.

**Coherencia y colocación de escuadras**

Cada miniatura de una escuadra debe mantenerse a **1" o menos de al menos otra miniatura de la misma escuadra**, formando un grupo coherente. Mientras esa cadena no se rompa, la escuadra puede adoptar la formación que quieras: en línea, en cuña o agrupada.

{{squadCoherenceDiagram}}

> A lo largo del reglamento, cuando una regla mencione **"unidad"**, se aplica igualmente a **"escuadra"**, salvo que se indique lo contrario.

## Tamaño de peanas recomendado

ZeroLore es agnóstico en cuanto a miniaturas, pero se recomienda usar peanas proporcionales al tipo de unidad para mantener la coherencia visual y táctica.

| Tipo de unidad | Peana recomendada |
| --- | --- |
| Milicia, Infantería, Choque, Especialista, Exploradores, Místico | 25 – 32 mm redonda |
| Comandante, Alado | 32 – 40 mm redonda |
| Élite, Juggernaut, Demonio, Armas Pesadas | 40 – 50 mm redonda |
| Monstruos | 60 – 100 mm redonda u ovalada |
| Vehículos ligeros | Ovalada 75 × 42 – 90 × 52 mm |
| Vehículos pesados, Artillería | Ovalada grande (100 – 170 mm) o sin peana |
| Titán | 130 – 170 mm o sin peana |

Estas medidas son orientativas. El criterio es que la peana sea coherente con el tamaño visual de la miniatura y no suponga una ventaja táctica injusta.

## Medición de distancias

Todas las distancias se miden en pulgadas (").

- Las mediciones se realizan **desde el punto más cercano de la peana** de la unidad que actúa hasta el punto más cercano del objetivo.
- Las distancias pueden medirse en cualquier momento de la partida.
- En caso de duda, cualquiera de los jugadores puede solicitar una **remedición precisa**, y el resultado se aplica de forma definitiva.

{{measurementDiagram}}

## Dados y tiradas

ZeroLore utiliza siempre dados de seis caras (1D6) y de 3 caras para algunas armas (1D3).

A lo largo de la partida se realizan distintos tipos de tirada: **iniciativa**, **precisión**, **salvación**, etc. Cada una se explica en detalle en su sección correspondiente.

## Modificadores

En ZeroLore verás valores expresados como 4+, 5+, 3+, etc. Esto significa el resultado mínimo necesario en 1D6 para que algo ocurra.

- **4+** → necesitas sacar 4, 5 o 6 → 3 de cada 6 dados → 50%
- **5+** → necesitas sacar 5 o 6 → 2 de cada 6 → ~33%
- **3+** → necesitas sacar 3, 4, 5 o 6 → 4 de cada 6 → ~67%

Cuando una regla dice **+1 al valor de Precisión**, el número necesario sube — es peor para el atacante. Si tu arma impacta con 4+ y recibes +1, ahora necesitas 5+. Al contrario, **-1 al valor de Precisión** es una ventaja: si impactas con 4+ y obtienes -1, ahora impactas con 3+. Esto aplica igual a Salvaciones.

Para evitar situaciones de inmortalidad o infalibilidad, los modificadores a Salvación e Impactos tienen los siguientes límites:

- **Salvación máxima:** ninguna unidad puede llegar a necesitar más de 6+ para salvar, independientemente de los modificadores acumulados. Un resultado de 1 siempre falla la salvación.
- **Precisión máxima:** ninguna unidad puede llegar a necesitar más de 6+ para impactar, independientemente de los modificadores acumulados. Un resultado de 6 siempre impacta.

{{modifiersDiagram}}

## Prioridad de reglas

En ZeroLore existen dos tipos de reglas: las **reglas generales**, que son las de este reglamento base y se aplican a todas las unidades, y las reglas propias de las unidades: la **habilidad de unidad**, propia de cada tipo *(ver Tipos de unidad)*, y las **habilidades de arma**.

Cuando una regla propia de una unidad contradiga o modifique una regla del reglamento, **la regla de la unidad siempre tiene prioridad**.

*Ejemplo: el reglamento dice que una unidad trabada no puede disparar. Si un arma tiene la habilidad Multiuso, esa regla especial permite disparar aunque estés trabado — y eso manda.*

## La regla de oro

ZeroLore está diseñado para ser flexible. Si durante una partida surge una situación no contemplada por las reglas:

- Los jugadores deben resolverla usando el **sentido común** y el acuerdo mutuo.
- Si no hay consenso, se puede realizar una tirada de 1D6 para decidir de forma rápida y continuar la partida.

## Número de jugadores

ZeroLore puede jugarse de **2 a 4 jugadores**. Los formatos disponibles son:

- **1vs1** — duelo entre dos jugadores.
- **1vs2** — enfrentamiento contra un jugador.
- **2vs2** — dos equipos de dos jugadores.
- **1vs1vs1** — todos contra todos de 3.
- **1vs1vs1vs1** — todos contra todos de 4.

En partidas de más de dos jugadores, el orden de activación se determina con la tirada del inicio de cada turno, y aplica también a equipos.

---

# Perfiles de unidad

Cada unidad de ZeroLore dispone de un **perfil** que define sus capacidades en el campo de batalla. Este perfil se utiliza siempre que la unidad se active, ataque o interactúe con el escenario.

![Ejemplo visual de perfil de unidad con tipo, valor y estadísticas]({{unitProfileImage}})

## Valores del perfil

### Tipo

Define el **rol funcional** de la unidad dentro del ejército. Determina si puede capturar objetivos y qué reglas especiales puede aplicar según su tipo *(ver Tipos de unidad)*.

### Movimiento

Indica la **distancia máxima**, en pulgadas ("), que la unidad puede desplazarse al realizar la acción **Moverse** o durante el desplazamiento concedido por **Destrabarse**.

Este valor también se utiliza como base para **Correr** y **Cargar** (Movimiento + Velocidad).

### Velocidad

Representa la **distancia adicional**, en pulgadas ("), que la unidad puede recorrer al **Correr** o **Cargar**.

Una unidad con mayor Velocidad puede cubrir más terreno en un solo impulso y alcanzar objetivos más lejanos al cargar.

### Vidas

Representa la cantidad total de daño que la unidad puede sufrir antes de ser destruida.

- Cada punto de daño reduce las Vidas de la unidad.
- Cuando las Vidas llegan a **0**, la unidad se retira del juego como destruida.
- El daño recibido se puede llevar el control usando los **tokens de daño** (-1, -3, -5, -10), colocándolos junto a la miniatura para indicar las Vidas perdidas.

### Salvación

Indica el resultado mínimo necesario en **1D6** para bloquear un impacto recibido.

*Ejemplo: una Salvación de 4+ bloquea impactos con resultados de 4, 5 o 6.*

### Habilidad de unidad

Regla especial propia del tipo de unidad *(ver columna Habilidad en Tipos de unidad)*. Se aplica siempre que la unidad esté en juego, salvo que se indique lo contrario.

### Escuadra

Indica cuántas miniaturas de este tipo pueden acompañar a un **Comandante** en su escuadra. Un **–** indica que la unidad no puede formar parte de una escuadra, a excepción del Comandante.

### Valor

Representa el **coste en puntos** de la unidad.

- Se utiliza para equilibrar enfrentamientos.
- Determina el tamaño y composición de los ejércitos.
- También se emplea para calcular el control cuando hay varias unidades en un mismo puesto de mando.

## Armas de la unidad

Cada unidad lleva exactamente **2 armas** en su perfil: **una a distancia y una de cuerpo a cuerpo**. Al realizar un ataque, el jugador utiliza el arma correspondiente al tipo de ataque. No es posible usar ambas armas en el mismo ataque.

## Perfiles de armas a distancia

Cada arma a distancia se describe mediante su propio perfil, que indica cómo se resuelve su ataque.

### Ataques

Cantidad de dados que se lanzan al realizar un ataque a distancia con esta arma. Cada dado representa un proyectil o disparo independiente.

### Distancia

Alcance máximo del arma en pulgadas ("). La unidad solo puede atacar objetivos dentro de este rango.

### Precisión

Resultado mínimo necesario en cada dado para impactar. Un resultado de **6** siempre cuenta como impacto crítico, salvo que una regla indique lo contrario.

### Daño / Daño crítico

Indica cuántas **Vidas** se pierden por cada impacto:

- **Daño**: impacto normal.
- **Daño crítico**: impacto obtenido con un resultado de 6 o según la habilidad del arma.

### Habilidades del arma

Reglas especiales asociadas únicamente a esa arma. Solo se aplican cuando se ataca con ella *(ver Habilidades de armas)*.

## Perfiles de armas de cuerpo a cuerpo

Las armas de cuerpo a cuerpo siguen una estructura similar, sin Distancia ni Precisión.

### Ataques

Cantidad de dados que lanza la unidad al atacar en combate cuerpo a cuerpo.

### Daño / Daño crítico

Funcionan igual que en las armas a distancia.

### Habilidades del arma

Reglas especiales que solo afectan a esta arma concreta.

## Habilidades de unidad y habilidades de arma

- Una habilidad de unidad se aplica siempre que la unidad esté en juego.
- Una habilidad de arma solo se aplica cuando esa arma se utiliza.

La habilidad de cada tipo de unidad se detalla en **Tipos de unidad**, y las habilidades de arma en **Habilidades de armas**.

---

# Tipos de unidad

Todas las unidades de ZeroLore pertenecen a un **tipo**. El tipo de unidad define su **rol en el campo de batalla**, así como qué puede o no puede hacer dentro de la partida. Todas las unidades disponen de **un ataque cuerpo a cuerpo** en su arsenal.

| Tipo | Descripción | Reglas | Habilidad | Fuerte contra |
| --- | --- | --- | --- | --- |
| **Milicia** | Tropa numerosa y barata, sacrificable. | Aporta su Valor al control de puestos y puede formar parte de la escuadra de un Comandante. | **Capturador:** esta unidad cuenta como el doble de su Valor al controlar o disputar puestos de mando. | +1 Especialista · +2 Místico |
| **Infantería** | La línea de fuego estándar del ejército. | Aporta su Valor al control de puestos y puede formar parte de la escuadra de un Comandante. | **Certero:** si esta unidad no se ha movido durante esta activación, mejora en **1** la Precisión de sus ataques a distancia (por ejemplo, de 4+ a 3+). | +1 Alado · +2 Milicia |
| **Choque** | Infantería que busca el cuerpo a cuerpo. | Aporta su Valor al control de puestos y puede formar parte de la escuadra de un Comandante. | **Carga brutal:** cuando esta unidad realiza una carga, gana **+1 dado de ataque CaC** durante ese combate. | +1 Armas Pesadas · +2 Infantería |
| **Élite** | Pocas miniaturas, duras y bien armadas. | Aporta su Valor al control de puestos y puede formar parte de la escuadra de un Comandante. | **Resistente:** la primera vez cada turno que esta unidad reciba daño, reduce ese daño en **1D3**. | +1 Choque · +2 Exploradores |
| **Especialista** | Apoyo y curación. | Aporta su Valor al control de puestos y puede formar parte de la escuadra de un Comandante. | **Soporte:** la unidad puede curar (**2 acciones**) a una unidad aliada a **6" o menos**: esa unidad recupera **1D3 Vidas** perdidas. | +1 Vehículo ligero · +2 Artillería |
| **Exploradores** | Se adelantan al resto del ejército. | Aporta su Valor al control de puestos y puede formar parte de la escuadra de un Comandante. | **Avanzadilla:** puede desplegarse a **9"** de un puesto de mando aliado. | +1 Místico · +2 Especialista |
| **Alado** | Rápidos, ignoran el terreno. | Aporta su Valor al control de puestos y puede formar parte de la escuadra de un Comandante. | **Vuelo:** esta unidad ignora terreno y obstáculos durante el movimiento y puede ascender diagonalmente sin coste adicional. No puede acabar su movimiento sobre otras miniaturas o zonas donde no pueda sostenerse. | +1 Artillería · +2 Armas Pesadas |
| **Armas Pesadas** | Equipos de fuego lentos y potentes. | Aporta su Valor al control de puestos y puede formar parte de la escuadra de un Comandante. | **Emplazado:** si esta unidad no se ha movido durante esta activación, gana **+1 dado** en sus ataques a distancia. | +1 Vehículo ligero · +2 Élite |
| **Místico** | Poderes que ignoran las defensas. | Aporta su Valor al control de puestos y puede formar parte de la escuadra de un Comandante. | **Mente abierta:** los ataques de esta unidad **ignoran la cobertura** del objetivo. | +1 Demonio · +2 Juggernaut |
| **Demonio** | Criaturas que se recomponen. | Aporta su Valor al control de puestos y puede formar parte de la escuadra de un Comandante. | **Regeneración:** al final de cada turno, si esta unidad sigue en el campo de batalla, recupera **1D3 Vidas** perdidas. | +1 Infantería · +2 Especialista |
| **Juggernaut** | Muy blindados y lentos. | Aporta su Valor al control de puestos y puede formar parte de la escuadra de un Comandante. | **Berserker:** las unidades enemigas que ataquen a esta unidad en CaC fallan con resultados naturales de **1, 2 o 3**. | +1 Demonio · +2 Choque |
| **Monstruo** | Criatura enorme. | No aporta Valor a los puestos. Puede usar sus acciones aunque esté trabado. No se beneficia de cobertura. | **Anclado:** las unidades enemigas trabadas con esta unidad no pueden realizar la acción **Destrabarse**. | +1 Milicia · +2 Infantería |
| **Vehículo ligero** | Rápido y móvil. | No aporta Valor a los puestos. Puede usar sus acciones aunque esté trabado. No se beneficia de cobertura. No puede trepar. | **Atropello:** durante su **carga**, si traba a una unidad enemiga, esa unidad recibe automáticamente **1D3** de daño. | +1 Exploradores · +2 Alado |
| **Vehículo pesado** | Blindado de primera línea. | No aporta Valor a los puestos. Puede usar sus acciones aunque esté trabado. No se beneficia de cobertura. No puede trepar. | **Cobertura móvil:** las unidades aliadas a **3" o menos** de esta unidad cuentan como en cobertura contra ataques a distancia. | +1 Juggernaut · +2 Monstruo |
| **Artillería** | Fuego de largo alcance, inmóvil. | No aporta Valor a los puestos. | **Atrincherado:** esta unidad no puede moverse. | +1 Vehículo pesado · +2 Titán |
| **Titán** | La mayor amenaza del campo de batalla. | Solo puede quedar trabado con otro Titán. Puede pasar por encima de escenografía baja. No aporta Valor a los puestos ni se beneficia de cobertura. | **Terror:** las unidades enemigas a **12" o menos** de esta unidad no pueden dispararle. | +1 Monstruo · +2 Vehículo pesado |
| **Comandante** | Líder de escuadra. | Único tipo que puede formar escuadras *(ver Comandantes y escuadras)*. | **Refuerzos:** durante la fase de despliegue, esta unidad puede recibir **una miniatura** de su tipo desde la Reserva, siempre que no esté trabada en CaC, colocada en coherencia con la escuadra. La escuadra nunca puede superar su número máximo de miniaturas. | — |

## Ventaja de tipo

Cuando una unidad ataca a un tipo de unidad sobre el que tiene ventaja (ver la columna **Fuerte contra**) y el ataque inflige daño, suma **+1 o +2 de daño adicional** al **daño total final** del ataque, según indique su ficha.

El **Comandante** no tiene ventaja de tipo contra ninguna unidad, y ninguna unidad la tiene contra él.

{{classAdvantageDiagram}}

---

# Estructura del turno de juego

Una partida de ZeroLore se divide en **turnos**, y el flujo es sencillo: los jugadores **alternan activaciones** hasta que todas las unidades hayan actuado.

{{turnStructureDiagram}}

## Quién empieza

Al comienzo de **cada turno**, cada jugador tira **1D6**: el resultado más alto actúa primero ese turno (en caso de empate, se repite la tirada).

En partidas de más de dos jugadores, esa tirada fija el orden de activación del turno.

## Fase de despliegue

Tras la tirada de iniciativa, y antes de la primera activación, se resuelve la **fase de despliegue**. Siguiendo el orden de iniciativa, cada jugador puede desplegar unidades desde su **Reserva**:

- **En puestos de mando:** como máximo **una unidad por cada puesto de mando que controle**, colocada en contacto con él.
- **En escuadras:** cada **Comandante** en el campo funciona como un puesto de mando para su propia escuadra: puede recibir **una miniatura** de su tipo desde la Reserva, colocada en coherencia con la escuadra *(ver habilidad Refuerzos en Tipos de unidad)*. No hace falta que la escuadra esté en un puesto de mando.

Condiciones:

- No se puede desplegar en un puesto de mando ocupado por unidades enemigas.
- La unidad debe **caber físicamente** en contacto con el puesto. Si no hay espacio libre suficiente, no puede desplegarse ahí.
- Las unidades desplegadas entran **sin activar** y pueden activarse ese mismo turno.

Las unidades que no se desplieguen permanecen en Reserva.

{{deploymentPhaseDiagram}}

## Activaciones

Los jugadores alternan activaciones, **una unidad cada vez**. Activar una unidad significa:

- Declararla como la unidad activa.
- Realizar hasta **dos acciones**, respetando el coste de cada una *(ver Acciones de una unidad)*.
- Resolver completamente sus efectos.

Una vez una unidad ha sido activada, **no puede volver a activarse** durante ese turno. Para llevar el control de las activaciones, cada unidad se puede marcar con el **token de activación** o con cualquier elemento disponible. Al inicio de cada turno se voltean o se retiran.

En partidas por equipos, los jugadores del mismo bando pueden coordinarse brevemente antes de actuar.

{{activationDiagram}}

## Fin del turno

Cuando **todas las unidades de ambos jugadores** han sido activadas, el turno termina: se resuelven los efectos que indiquen hacerlo al final del turno y se cuentan los puntos. La **puntuación, las condiciones de victoria y la preparación de la partida** se detallan en el documento de **Misiones**. Después se voltean los tokens y comienza un turno nuevo.

---

# Puestos de mando y despliegue

Los puestos de mando son posiciones estratégicas repartidas por el campo de batalla. Se representan en mesa con el **token de puesto de mando** (círculo o cuadrado). Además de ser objetivos a conquistar, son los únicos puntos desde donde las unidades pueden desplegarse. Cuando un jugador conquista un puesto de mando, coloca el **token de banderilla** de su color encima del puesto de mando para indicar el control. Si el rival lo reconquista, sustituye la banderilla por la suya.

## Cuartel General

Cada jugador tiene obligatoriamente un **Cuartel General**. Funciona como un puesto de mando normal a efectos de control y despliegue.

## Control de un puesto

**Ocupar un puesto:** una unidad se considera dentro de un puesto de mando cuando **la mitad o más de su peana** está sobre él. En escuadras, cada miniatura se comprueba por separado.

**Control al final de turno:** al final de cada turno, si hay unidades de ambos jugadores en un mismo puesto de mando, el control lo obtiene el jugador cuyas unidades sumen más Valor total en ese puesto.

**Unidades que no aportan Valor:** los **Vehículos, Monstruos, Artillería y Titanes nunca aportan su Valor** al control de un puesto, aunque estén sobre él; pueden ocuparlo físicamente pero no lo conquistan ni lo defienden a efectos de control.

**Unidades trabadas en CaC:** las unidades de ambos bandos que estén en combate cuerpo a cuerpo dentro de un puesto de mando **no cuentan para el cálculo de control**. Se tratan como si no existiesen a efectos del puesto hasta que el combate se resuelva. En caso de empate, el puesto permanece bajo el control de quien lo tuviera.

{{commandPostDiagram}}

## Despliegue inicial

Al inicio de la partida, cada jugador despliega libremente una unidad por puesto, desde Reserva, en los puestos de mando que controle.

Cada jugador tira **1D6** — el resultado más alto despliega primero. Los jugadores se alternan desplegando unidad por unidad hasta que ambos decidan no desplegar más.

Las unidades que no se desplieguen en este momento permanecen en **Reserva**.

## Reserva

Las unidades en Reserva aún no han entrado al campo de batalla. Entran durante la **fase de despliegue** de cada turno *(ver Estructura del turno de juego)*.

Algunas unidades disponen de **habilidades especiales de despliegue** indicadas en su tipo, como **Avanzadilla**.

*Cuantos más puestos domines, más rápido te llegan los refuerzos.*

---

# Acciones de una unidad

Cada vez que una unidad es activada, dispone de **2 acciones**. Las acciones se resuelven de una en una: cada acción debe completarse antes de comenzar la siguiente, y una misma acción no puede repetirse durante la misma activación, salvo que una regla indique lo contrario. La unidad puede renunciar a una o a ambas acciones.

Las acciones disponibles son:

| Acción | Coste |
| --- | --- |
| Moverse | 1 |
| Disparar | 1 |
| Correr | 2 |
| Cargar | 2 |
| Atacar cuerpo a cuerpo | 2 |
| Destrabarse | 1 |

Una acción con coste de **2 acciones** consume toda la activación de la unidad. Moverse y Disparar son acciones independientes de coste 1: una unidad puede, por ejemplo, Moverse y luego Disparar en la misma activación **sin penalización**, salvo que una habilidad indique lo contrario.

{{actionsDiagram}}

---

# Reglas de movimiento

Las siguientes reglas se aplican siempre que una acción o regla permita desplazar una unidad.

## Moverse

La unidad consume **1 acción** y puede desplazarse hasta su **Movimiento**, o hasta la distancia que indique la regla utilizada.

- Las unidades pueden moverse en cualquier dirección.
- No se puede mover una unidad a **menos de 1"** de una unidad enemiga, salvo al Cargar.
- El movimiento puede utilizarse para rodear obstáculos o posicionarse libremente en el campo de batalla.

## Correr

La unidad consume **2 acciones** y puede desplazarse hasta su **Movimiento + Velocidad**. Durante esta activación no puede realizar ataques ni terminar su movimiento a 1" o menos de una unidad enemiga.

## Terreno y obstáculos

Una unidad puede:

- Rodear obstáculos libremente.
- Trepar superficies elevadas si su movimiento le permite alcanzar físicamente la altura deseada.

Para trepar:

1. La unidad debe mover hasta tocar la base del obstáculo con su peana. A continuación, se mide la altura vertical que desea escalar, consumiendo movimiento.
2. Las unidades con la habilidad **Vuelo** pueden subir obstáculos de manera diagonal.

**Vehículos y Monstruos en altura.** Los **Vehículos no pueden subir** a estructuras, plataformas ni pisos elevados: se mueven solo a nivel de suelo. Los **Monstruos sí pueden subir**, siempre que **quepan físicamente en el espacio** al que acceden. Si la miniatura no entra en esa planta o plataforma —por ejemplo, su cabeza choca con el piso superior de un edificio de varias plantas—, no puede colocarse ahí.

**Titanes.** Un Titán puede pasar por encima de cualquier elemento de escenografía cuya altura no supere la **mitad de la altura del Titán**, pero no puede terminar su movimiento encima de él. Si el elemento es más alto, no puede atravesarlo y debe rodearlo.

{{climbingDiagram}}

---

# Combate a distancia

Las unidades pueden realizar **ataques a distancia** contra objetivos válidos utilizando el arma a distancia de su perfil.

## Disparar

La unidad consume **1 acción** y realiza un ataque a distancia. Puede dispararse tanto si la unidad se ha movido antes como si no; moverse y disparar son acciones independientes y no se penalizan entre sí, salvo que una habilidad indique lo contrario.

Una unidad trabada no puede realizar esta acción, salvo que una regla se lo permita, como **Multiuso** o las reglas de Vehículos y Monstruos.

Para atacar a distancia, la unidad debe:

- Tener **línea de visión** con el objetivo.
- Estar dentro del **alcance** del arma utilizada.
- No estar restringida por una regla especial.

## Línea de visión

Para que una unidad pueda atacar a distancia a otra, debe tener **línea de visión**.

- Se considera que una unidad tiene línea de visión si **puede verse cualquier parte de la miniatura objetivo** desde el punto de vista del atacante.
- La línea de visión se mide desde **cualquier punto del cuerpo de la miniatura atacante** (no desde el arma ni desde la peana). Si desde algún punto del cuerpo del atacante puede verse cualquier parte de la miniatura objetivo, existe línea de visión.
- Las unidades tienen visión en **360 grados**; la orientación de la miniatura no limita su campo visual.
- Si una miniatura (aliada o enemiga) o un elemento de escenografía bloquea completamente la visión, el objetivo **no puede ser atacado** a distancia.

{{lineOfSightDiagram}}

## Secuencia de ataque a distancia

Todo ataque a distancia se resuelve siguiendo siempre esta secuencia:

1. Elegir objetivo.
2. Determinar el número de dados de ataque del arma.
3. Tirar y superar o igualar la precisión.
4. Tirar salvaciones por parte del defensor.
5. Aplicar daño.

{{rangedSequenceDiagram}}

### 1. Elegir objetivo

La unidad atacante elige una unidad enemiga visible y dentro del alcance del arma.

- Una unidad puede atacar solo a **un objetivo**, salvo que una regla indique lo contrario.
- Si al menos una miniatura de la unidad atacante tiene línea de visión, la unidad puede efectuar el ataque.

### 2. Determinar ataques

Cada arma indica cuántos **Ataques** realiza.

- Se lanzan tantos dados como indique el valor de Ataques del arma.
- Cada dado representa un disparo o proyectil independiente.

### 3. Tirada de precisión

Por cada dado lanzado:

- Si el resultado es **igual o superior al valor de Precisión** del arma, el ataque impacta.
- Un resultado de **6** se considera un **impacto crítico**, salvo que una regla indique lo contrario.
- Los resultados inferiores al valor de Precisión se consideran fallos y se descartan.

Los dados que impactan **no se vuelven a tirar**.

### 4. Tirada de salvaciones

El jugador defensor lanza tantos dados como impactos haya recibido la unidad.

- Cada resultado **igual o superior al valor de Salvación** bloquea un impacto.
- Los impactos críticos se bloquean utilizando la Salvación normal, salvo que una regla indique lo contrario.
- Los impactos no bloqueados pasan a infligir daño.

### 5. Aplicar daño

Cada impacto no bloqueado inflige el daño indicado por el arma.

- Los impactos normales infligen el **daño base**.
- Los impactos críticos infligen el **daño crítico** del arma.

Cuando una unidad pierde todas sus Vidas, se retira del juego como destruida.

---

# Coberturas

Las coberturas modifican la defensa de las unidades atacadas. Para beneficiarse de una cobertura, **la unidad debe estar con su peana en contacto directo con el elemento de escenografía que actúa como cobertura** — si no hay contacto de peana, no hay cobertura.

## Qué se considera cobertura

Un elemento de escenografía proporciona cobertura si su altura supera al menos la mitad de la miniatura que busca protegerse.

{{coverDiagram}}

## Efecto de la cobertura

La unidad mejora en 1 su **Salvación** frente a ataques a distancia (p. ej., de 4+ pasa a 3+), mejorando así sus posibilidades de bloquear impactos.

Si la unidad en cobertura es atacada en cuerpo a cuerpo, el atacante falla con resultados de 1, 2 o 3.

## Atravesar coberturas

Una unidad puede atravesar un elemento de escenografía si es físicamente más alta que él. Los huecos y ventanas pueden atravesarse libremente, siempre que tengan un tamaño razonable para que pase la miniatura — esto se resuelve por sentido común entre los jugadores.

## Cobertura y línea de visión

La cobertura no altera las reglas de línea de visión: si el atacante puede ver **cualquier parte** de la miniatura objetivo, esta puede ser atacada, beneficiándose igualmente de la cobertura. Si no puede verse ninguna parte de la miniatura, no puede ser atacada a distancia, salvo que una regla indique lo contrario.

Si el atacante tiene **línea de visión limpia a la unidad completa** — sin que ninguna parte del elemento de escenografía se interponga entre atacante y objetivo — **no hay cobertura**, aunque la unidad esté en contacto físico con dicho elemento. La cobertura requiere que el obstáculo bloquee parte del tiro, no solo que esté cerca.

Las miniaturas aliadas o enemigas que bloquean completamente la visión actúan como obstáculos a efectos de línea de visión. Si una unidad es parcialmente visible pero no está en contacto con ninguna cobertura, no se aplican bonificaciones defensivas.

## Unidades sin cobertura

**Vehículos, Monstruos y Titanes** no se benefician de cobertura. Sus dimensiones impiden que cualquier obstáculo les proporcione protección efectiva, salvo que la unidad esté completamente fuera de la línea de visión.

---

# Combate cuerpo a cuerpo

La **única forma de entrar en combate cuerpo a cuerpo es mediante una carga**. Una unidad que carga y alcanza a su objetivo entra en contacto físico con él: ambas quedan **trabadas en combate** y no pueden separarse sin Destrabarse.

Fuera de una carga, ninguna unidad puede acercarse a **menos de 1"** de una unidad enemiga.

{{meleeEngagementDiagram}}

## Cargar

La unidad consume **2 acciones** y puede desplazarse hasta su **Movimiento + Velocidad** hacia una unidad enemiga.

Si el movimiento le permite alcanzar al objetivo, coloca la miniatura en contacto de peana y lanza **1D6**:

- Con un resultado de **2+**, la carga tiene éxito: ambas unidades quedan **trabadas** y la unidad atacante realiza inmediatamente un **ataque cuerpo a cuerpo gratuito**.
- Con un resultado de **1**, la carga se frena: retira la miniatura hasta **1" del objetivo**, sin trabar y sin atacar. Su activación termina.

Si no alcanza al objetivo con su movimiento, termina donde haya llegado y su activación termina, sin efectuar la tirada.

**Aclaración:** cualquier movimiento que termine en contacto de peana con una unidad enemiga es una **carga**. No es posible entrar en contacto mediante la acción Moverse ni al Correr.

Una unidad puede Cargar contra una unidad ya trabada en combate. Tras la carga, todas las unidades involucradas se consideran trabadas en el mismo combate.

*Ejemplo: tus Cruzados (Movimiento 5", Velocidad +2") tienen una unidad enemiga a 6". Declaran Cargar y se mueven 7" hasta tocarla; con un 2+ en el dado la carga prende, quedan trabados y atacan gratis. El defensor responderá en su propia activación.*

{{chargeDiagram}}

## Unidades trabadas

Dos unidades quedan **trabadas** cuando están en **contacto físico**: peana con peana, o miniatura con miniatura si alguna no tiene peana (como un vehículo grande). Solo se puede llegar a ese contacto mediante una **carga**. Los Titanes son una excepción *(ver Titanes en combate cuerpo a cuerpo)*.

Mientras siga trabada, una unidad solo puede usar las acciones **Atacar cuerpo a cuerpo** o **Destrabarse**, salvo que una regla indique lo contrario. Si logra Destrabarse, deja de estar trabada y su acción restante se rige por las reglas normales.

Las unidades permanecen trabadas hasta que una sea eliminada o consiga Destrabarse.

{{lockedUnitsDiagram}}

## Atacar cuerpo a cuerpo

Una unidad **trabada** consume **2 acciones** y ataca con su arma de cuerpo a cuerpo a una unidad enemiga con la que esté trabada.

Si está trabada con varias unidades enemigas, elige una sola como objetivo, salvo que una regla indique lo contrario.

## Resolución del combate cuerpo a cuerpo

El combate cuerpo a cuerpo se resuelve siguiendo esta secuencia:

1. La unidad atacante lanza los dados de **Ataques** de su arma de cuerpo a cuerpo.
2. Los resultados de **1 y 2** se consideran fallos. Un resultado de **6** es un impacto crítico.
3. El defensor lanza tantos dados de **Salvación** como impactos haya recibido. Los impactos críticos se bloquean utilizando la Salvación normal, salvo que una regla indique lo contrario.
4. Los impactos no bloqueados infligen el daño base o crítico del arma atacante.

{{meleeSequenceDiagram}}

Si el defensor sobrevive, podrá atacar en su propia activación.

## Destrabarse

Una unidad trabada consume **1 acción** para intentar abandonar el combate. Lanza 1D6:

- Con un resultado de **4+**, deja de estar trabada. La unidad puede usar su **acción restante** con normalidad (Moverse o Disparar). Si se mueve, debe terminar a más de 1" de todas las unidades enemigas.
- Con un resultado de **1, 2 o 3**, no consigue liberarse: **pierde todas sus acciones** y su activación termina de inmediato.

Si está trabada con varias unidades enemigas, una única tirada permite separarse de todas. Si al moverse no existe una posición válida a más de 1" de cada enemigo, no podrá alejarse, pero sigue destrabada.

## Disparar a unidades trabadas

Una unidad trabada en combate cuerpo a cuerpo **no puede ser atacada a distancia** por unidades externas al combate, salvo que una habilidad indique lo contrario. Los Vehículos, Monstruos y Titanes son una excepción *(ver a continuación)*.

## Vehículos y Monstruos en combate cuerpo a cuerpo

Los Vehículos y Monstruos no quedan bloqueados por estar trabados como el resto de unidades. Aunque estén trabados en combate cuerpo a cuerpo, pueden usar sus acciones con libertad: **Disparar** (si tienen un arma a distancia), **Atacar cuerpo a cuerpo**, o cualquier combinación que permitan sus acciones. El jugador decide en qué gasta cada una.

Además, estas unidades **pueden ser atacadas a distancia** aunque estén trabadas en combate cuerpo a cuerpo.

{{vehicleMeleeDiagram}}

## Titanes en combate cuerpo a cuerpo

Un Titán **solo puede quedar trabado con otro Titán**. Frente a cualquier otra unidad, ignora por completo las reglas de trabado:

- Una unidad que no sea Titán puede Cargar contra un Titán y, si la carga tiene éxito, realiza su ataque cuerpo a cuerpo gratuito, pero **ninguna de las dos queda trabada**. Tras el ataque, la unidad que cargó se retira hasta 1" del Titán.
- Un Titán puede Cargar contra una unidad que no sea Titán y realizar su ataque gratuito del mismo modo, sin quedar trabados. Tras el ataque, el Titán se retira hasta 1" del objetivo.
- Al no quedar trabado, el Titán puede usar sus acciones con normalidad y **puede ser atacado a distancia aunque tenga enemigos en contacto**.

{{titanMeleeDiagram}}

---

# Comandantes y escuadras

Una **escuadra** es un **Comandante** acompañado de varias miniaturas del mismo tipo de unidad, que actúan como una sola unidad.

## Formar una escuadra

Solo un **Comandante** puede formar una escuadra.

- Al montar la lista, cada Comandante puede llevar una escuadra de **un único tipo de unidad**, con tantas miniaturas como indique la columna **Escuadra** de esa unidad. Las unidades con **–** en esa columna no pueden formar parte de una escuadra.
- El Comandante se **despliega junto a su escuadra completa**, como una sola unidad, y se activa con ella.
- Mientras esté en escuadra, el Comandante usa el **Movimiento y la Velocidad de las unidades que comanda**.
- El Comandante es siempre **el último en caer** de su escuadra *(ver Eliminación de miniaturas en escuadra)*.
- Las escuadras **no pueden formarse ni fusionarse durante la partida**, salvo mediante la habilidad **Refuerzos** del Comandante *(ver Tipos de unidad)*. Una unidad desplegada en solitario sigue sola toda la partida.

{{commanderSquadDiagram}}

## Línea de visión en escuadras

Si al menos una miniatura de una escuadra enemiga es visible desde el atacante, la escuadra completa puede ser elegida como objetivo de un ataque a distancia.

## Uso de armas en escuadras

Cada miniatura utiliza las armas de su perfil. Al atacar, una escuadra con Comandante realiza **dos ataques separados**: primero el de las miniaturas de la escuadra, todas con el arma elegida, y después el del **Comandante** con su propia arma. Ambos ataques van dirigidos **al mismo objetivo**, salvo que una regla indique lo contrario.

{{squadMeleeDiagram}}

## Combate cuerpo a cuerpo en escuadras

En cuanto una miniatura de la escuadra entra en contacto de peana con una unidad enemiga, **la escuadra entera se considera trabada** y todas sus miniaturas participan en el combate, realizando sus ataques de forma conjunta.

Aunque una escuadra pueda estar en contacto con varias unidades enemigas, al realizar un ataque cuerpo a cuerpo debe **elegir una única unidad objetivo**, salvo que una regla indique lo contrario.

La acción de ataque se considera **consumida por toda la escuadra**.

## Eliminación de miniaturas en escuadra

Cuando una escuadra sufre daño, el jugador que la controla decide qué miniatura lo recibe, con una excepción: **el Comandante no puede recibir daño mientras quede otra miniatura de su escuadra en pie**.

Todo el daño se aplica a esa miniatura hasta que es eliminada. No es posible distribuir el daño de un mismo ataque entre varias miniaturas mientras la miniatura elegida siga en pie. Si la miniatura elegida es eliminada y aún queda daño por asignar, el jugador elige otra miniatura de la escuadra a la que aplicar el daño restante, siguiendo las mismas reglas.

{{squadDamageDiagram}}

---

# Habilidades de armas

Algunas armas tienen una habilidad que modifica la forma en la que resuelven sus ataques.

Estas habilidades sirven para diferenciar armas sin añadir reglas complejas. Algunas armas son simples y fiables, otras buscan golpes críticos, otras atraviesan mejor las defensas, y otras son poderosas pero arriesgadas.

Cuando una unidad realiza un ataque, utiliza el arma de su perfil correspondiente a ese tipo de ataque. Si esa arma tiene una habilidad, aplica su efecto durante ese ataque.

| Habilidad de arma | Descripción |
| --- | --- |
| Fiable | Esta arma no tiene reglas especiales. |
| Ángulo muerto | Esta arma no puede disparar a objetivos que estén a menos de la mitad de su Distancia. |
| Brutal X+ | Los impactos de esta arma se consideran críticos con un resultado natural de **X+** en la tirada de ataque. |
| Perforante | Los impactos de esta arma empeoran en **1** la Salvación realizada contra ellos. |
| Inestable | Tras resolver el ataque, lanza 1D6. Con un resultado de 1 o 2, la unidad que porta esta arma sufre el mismo daño que infligió al objetivo. Si el ataque no causó daño, no hay retroceso. |
| Multiuso | Esta arma puede utilizarse para realizar la acción Disparar aunque la unidad esté trabada en combate cuerpo a cuerpo. |
| Directo | Esta arma impacta directamente y no utiliza Precisión; por tanto, no se ve afectada por modificadores a la Precisión. |
| Explosiva (X) | Si el objetivo sufre daño, la explosión alcanza hasta **X miniaturas adicionales** a 3" de la impactada, que sufren el mismo daño directo. Se asignan **primero a miniaturas enemigas** y, si quedan impactos por repartir, continúan con las **aliadas**. En ambos casos, el **propietario de las miniaturas afectadas decide cuáles reciben el daño**, siguiendo las reglas normales de asignación en escuadra. |
| Parabólica | Esta arma puede atacar a objetivos sin línea de visión directa, siempre que estén dentro de su **Distancia** y no estén cubiertos. |
| Alcance | Esta arma CaC puede usarse contra cualquier unidad enemiga a 3" o menos, esté o no trabada con esta unidad. Atacar así no traba a las unidades. |
| Errática | Antes de resolver el ataque, lanza 1D6: el resultado es la Precisión del arma a distancia durante ese ataque. |
| Barrido | Arma de cuerpo a cuerpo. Al atacar, en vez de elegir un objetivo, **ataca a TODAS las unidades enemigas trabadas con ella**. Resuelve el ataque por separado contra cada una. |
| Anti | Esta arma inflige **1D3 de daño extra** contra el tipo de unidad al que tenga ventaja. |

**Nota:** Directo, Errática, Ángulo muerto y Parabólica son habilidades exclusivas de las **armas a distancia**; Alcance y Barrido, de las **armas de cuerpo a cuerpo**.

{{explosiveDiagram}}

---

# Equipamiento

Los **objetos** son **cartas de un solo uso** que se compran con **Valor** al montar la lista. El catálogo completo, con su coste, se encuentra en su propia sección.

- Los objetos **no se asignan a ninguna unidad al montar la lista**: se llevan como cartas y se juegan durante la partida sobre la unidad que quieras, siempre que cumpla los requisitos de la carta.
- Un ejército puede repetir objetos, con un **máximo de 3 copias del mismo objeto**, salvo que la carta indique otro límite.
- **Momento de uso:** cada carta indica **cuándo** puede jugarse ("durante su activación", "al ser declarada objetivo", "al desplegar"…). Si ese momento pasa sin declararla, el objeto **no puede aplicarse retroactivamente** *(ver Acciones olvidadas, en Consideraciones generales)*.
- **Coste:** usar un objeto cuesta **1 acción** de la unidad que lo usa, salvo que la carta indique otro coste. Las cartas que se juegan como **reacción** (al ser atacado, al fallar una tirada…) no consumen acciones: se declaran en el momento que indica la carta.
- El objeto afecta a **la unidad, no a cada miniatura**: una escuadra se beneficia del objeto una sola vez, tenga las miniaturas que tenga.
- Los ataques y efectos generados por un objeto (como Inmolarse) **no se benefician de modificadores de acciones ni de habilidades** (Moverse, Disparar, Certero, Emplazado…): hacen exactamente lo que dice su carta.
- Tras usarse, la carta se **descarta**.

**Manejo en mesa:** los objetos funcionan como una **baraja de cartas**. Cada jugador tiene delante las cartas que ha comprado y las descarta al usarlas, así queda siempre a la vista qué le queda por gastar.

---

## Consideraciones generales

**1. Acciones olvidadas:** *si un jugador olvida realizar una acción, usar una habilidad o declarar un efecto en su momento, se considera perdida y no se puede recuperar, salvo acuerdo mutuo entre ambos jugadores.*

**2. Concordancia estética:** *aunque el juego es completamente agnóstico respecto a las miniaturas, se recomienda que el ejército tenga coherencia visual. El jugador es libre de usar lo que quiera.*

**3. Comunicar intenciones:** *comunicar las intenciones de cada jugada ayuda a mantener una partida fluida y clara.*

**4. Cronómetro:** *como variante opcional, se puede usar un cronómetro de 1 a 2 minutos por activación para agilizar la toma de decisiones.*

---
