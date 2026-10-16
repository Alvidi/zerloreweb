# Reglamento ZeroLore

ZeroLore está diseñado para ser flexible, modular y adaptable. Si es la primera vez que juegas, empieza por hacerte con lo básico de las unidades antes de saltar a las armas y las habilidades, y ve añadiendo conceptos a medida que te familiarices con el juego.

**Este reglamento proporciona una base sólida, pero los jugadores son libres de crear escenarios, campañas y reglas adicionales manteniendo la estructura fundamental del sistema.**

---

# Conceptos fundamentales

Antes de empezar, conviene aclarar algunos conceptos que se usan a lo largo de todo el reglamento. ZeroLore utiliza un lenguaje sencillo y directo, pero estas definiciones evitan confusiones durante la partida.

## Miniaturas y unidades

Cada **unidad** es una sola miniatura: un combatiente, una criatura o un vehículo, salvo las **escuadras**, que agrupan varias miniaturas en una sola unidad *(ver Capitanes y escuadras)*. Es el elemento básico del juego: se despliega, se activa y combate por su cuenta.

## Medición de distancias

Todas las distancias se miden en pulgadas ("), desde el **punto más cercano de la peana** de la unidad que actúa hasta el punto más cercano del objetivo. Se puede medir en cualquier momento de la partida, y en caso de duda cualquier jugador puede pedir una **remedición precisa**, cuyo resultado es definitivo. Para el tamaño de las peanas, consulta el **Anexo** del final.

{{measurementDiagram}}

## Dados y tiradas

ZeroLore utiliza dados de seis caras (1D6) y, en algunas armas y habilidades, dados de tres caras (1D3). Las tiradas principales son la de **quién empieza**, la de **Precisión** (para impactar) y la de **Defensa** (para bloquear), y cada una se explica en su sección.

## Modificadores

En ZeroLore verás valores como 3+, 4+ o 5+. Indican el resultado mínimo que necesitas en 1D6 para que algo ocurra: un **3+** se consigue con 3, 4, 5 o 6; un **4+** con 4, 5 o 6; y un **5+** con 5 o 6.

Algunas reglas **mejoran** o **empeoran** estos valores. Mejorar en 1 significa que te basta un número menos (de 4+ a 3+), y empeorar en 1, que necesitas uno más (de 4+ a 5+). Por ejemplo, la cobertura **mejora en 1 la Defensa**, y un arma Perforante **empeora en 1 la Defensa** del objetivo. Los modificadores se suman y se aplican antes de tirar.

**Límites.** Ningún valor puede quedar mejor que **2+** ni peor que **6+**: un 1 siempre falla y un 6 siempre funciona.

*Ejemplo: unos Hostigadores (Defensa 4+) en cobertura pasan a Defensa 3+. Si les disparan con un arma Perforante, vuelven a Defensa 4+.*

{{modifiersDiagram}}

## Prioridad de reglas

En ZeroLore hay dos tipos de reglas: las **reglas generales** de este reglamento, que se aplican a todas las unidades, y las **reglas propias**, que son la habilidad de cada unidad, las habilidades de sus armas, las habilidades de Héroe y el Equipamiento. Cuando una regla propia contradice o modifica una regla general, **siempre manda la regla propia**. Y si una habilidad de Héroe o un Equipamiento contradice la habilidad de una unidad, manda la del Héroe o el Equipamiento.

*Ejemplo: el reglamento dice que para disparar hace falta línea de visión, pero la Artillería tiene la habilidad Fuego indirecto, que le permite atacar sin ella. Manda la habilidad. Del mismo modo, la Artillería no puede moverse, pero el Héroe Ingeniero de Asedio le permite hacerlo: manda el Héroe.*

## La regla de oro

Si durante la partida surge una situación que las reglas no contemplan, los jugadores la resuelven con **sentido común** y de mutuo acuerdo. Si no hay consenso, se tira 1D6 para decidir y se sigue jugando.

## Número de jugadores

ZeroLore se juega de **2 a 4 jugadores**: en duelo (1vs1), por equipos (2vs2) o todos contra todos, de tres o de cuatro jugadores. En las partidas de más de dos jugadores, el orden de juego se fija con la tirada del inicio de la partida y se mantiene hasta el final.

---

# Perfiles de unidad

Cada unidad tiene un **perfil** que define sus capacidades en el campo de batalla. Es lo que consultas cada vez que la unidad se activa, ataca o interactúa con el escenario.

![Ejemplo visual de perfil de unidad con tipo, valor y estadísticas]({{unitProfileImage}})

## Valores del perfil

**Tipo.** Qué es la unidad (Hostigadores, Monstruo, Titán…) *(ver Tipos de unidad)*.

**Rol.** Etiqueta que agrupa tipos con una función parecida: Soldado, Élite, Movilidad, Pesado, Fuego pesado o Especial *(ver Roles)*.

**Movimiento.** Distancia máxima, en pulgadas, que la unidad recorre al **Avanzar**. Al **Correr** o **Cargar** se le suma **1D6**.

**Vidas.** Cuánto aguanta la unidad. Cada impacto que no se bloquea le quita **1 Vida**, y cuando llega a **0** se retira del juego como destruida. Para llevar la cuenta vale cualquier sistema: marcadores, una hoja de registro o lo que prefieran los jugadores.

**Defensa.** Resultado mínimo en 1D6 para bloquear un impacto. *Por ejemplo, con 4+ se bloquea con 4, 5 o 6.*

**Habilidad de unidad.** Regla especial propia del tipo de unidad *(ver pestaña Ejércitos)*. Se aplica siempre que la unidad esté en juego, salvo que se indique lo contrario.

**Escuadra.** Número máximo de miniaturas de ese tipo que pueden formar una escuadra con un **Capitán** *(ver Capitanes y escuadras)*. Un **–** indica que la unidad no puede formar parte de una escuadra.

**Valor.** Coste en puntos de la unidad. Sirve para equilibrar los enfrentamientos y determinar el tamaño de los ejércitos, y también para calcular quién controla un puesto de mando cuando hay varias unidades en él.

## Armas de la unidad

Cada unidad lleva las armas indicadas en su perfil: un arma a distancia y un arma cuerpo a cuerpo. Al atacar, usa el arma que corresponde a ese tipo de ataque, nunca las dos a la vez. Si en su perfil no tiene arma a distancia (**—**), no puede disparar.

## Perfiles de armas

Cada arma tiene un perfil que indica cómo se resuelve su ataque: Ataques, Precisión y Habilidades del arma. Las armas a distancia también tienen Alcance.

**Ataques:** número de dados que se lanzan; cada dado es un disparo o golpe independiente. En las cartas se indica como **1D**, **2D**, **3D**…: 1D es un dado, 2D son dos dados, y así sucesivamente. Si pone **1D3**, **1D6** o **2D6**, el número de dados es variable: primero se tira ese dado para saber cuántos ataques hace la unidad esa vez. Si además lleva un número sumado, como **1D6+1** o **2D6+3**, ese número se suma al resultado. *Por ejemplo, con 2D6+3, si sacas un 7, la unidad hace 10 ataques.*

**Alcance:** distancia máxima en pulgadas a la que puede atacar un arma a distancia. Las armas cuerpo a cuerpo no tienen este valor: atacan al llegar al contacto tras cargar, salvo que una regla propia permita hacerlo de otra forma.

**Precisión:** resultado mínimo en cada dado para impactar.

**Habilidades del arma:** reglas especiales que solo se aplican al atacar con esa arma *(ver Habilidades de armas)*.

Cada impacto que no se bloquea quita **1 Vida**, sea cual sea el arma.

## Habilidades de armas

Algunas armas tienen una habilidad que cambia cómo se resuelven sus ataques. Sirven para diferenciar armas sin añadir reglas complejas: unas son simples y fiables, otras sacan partido de los 6, otras atraviesan mejor las defensas. Cuando una unidad ataca con un arma que tiene habilidad, aplica su efecto durante ese ataque.

| Habilidad | Descripción |
| --- | --- |
| Fiable | Esta arma no tiene reglas especiales. |
| Perforante 1 o 2 | Empeora en 1 o 2 la Defensa del objetivo. |
| Golpe crítico | Los impactos con un 6 no se pueden bloquear con la Defensa. |
| Ráfaga | Cada impacto con un 6 añade 1 dado de ataque más, que se tira en ese momento. Si vuelve a salir un 6, se sigue añadiendo. |
| Certera | Ignora la cobertura: el objetivo no mejora su Defensa por estar cubierto. |
| Directo | Todos los dados impactan, sin tirar Precisión. |
| Implacable | Puede volver a tirar una vez los dados que no hayan impactado. |
| Disparo certero | Si el objetivo está a la mitad o menos del Alcance del arma, el ataque gana 1 dado de ataque más. |
| Pesada | Si la unidad no se ha movido en esta activación, el ataque gana 1 dado de ataque más. |

Cada arma puede tener como máximo **dos** habilidades. Todas sirven tanto en armas a distancia como cuerpo a cuerpo, salvo **Disparo certero** y **Pesada**, que solo pueden ir en armas a distancia.

{{burstDiagram}}

{{relentlessDiagram}}

{{heavyDiagram}}

---

# Tipos de unidad

Todas las unidades de ZeroLore pertenecen a un **tipo** (Hostigadores, Monstruo, Titán…). El tipo define su papel en el campo de batalla y su **habilidad de unidad**. La descripción y la habilidad de cada tipo están en la pestaña **Ejércitos**.

## Roles

Cada tipo pertenece a un **rol**, que agrupa unidades con una función parecida. Algunas reglas, como las de los Héroes o el Equipamiento, nombran un rol en lugar de cada tipo.

- **Soldado:** la base del ejército, numerosa y barata. *Milicia, Noveles tiradores, Hostigadores, Infantes.*
- **Élite:** pocas, muy blindadas y muy fiables. *Bastión, Paladín.*
- **Movilidad:** rápidas, para llegar antes que nadie a los objetivos. *Explorador, Asaltante.*
- **Pesado:** criaturas y vehículos enormes. *Monstruo, Vehículo ligero, Vehículo pesado, Titán.*
- **Fuego pesado:** armas grandes y lentas, de largo alcance. *Artillería, Armas Pesadas.*
- **Especial:** unidades con una función única. *Capitán, Soporte, Psíquico.*

**Pesado y Fuego pesado.** Por su tamaño, estas unidades tienen tres límites:

- **No aportan Valor a los puestos de mando.** Pueden ocuparlos, pero no los conquistan ni los defienden, aunque estén solas en ellos.
- **No pueden trepar.** Se mueven siempre a nivel de suelo.
- **Nunca reciben cobertura.**

## Héroes

Cada ejército lleva **un único Héroe**, obligatorio, y es lo primero que se elige al preparar el ejército. Los Héroes son unidades especiales con habilidades únicas que influyen en la partida y en la estrategia del ejército. Sus habilidades se detallan en el perfil de cada Héroe. Es siempre la **primera unidad en desplegarse** *(ver Despliegue inicial)*.

La habilidad del Héroe funciona desde que se despliega. Si el Héroe es destruido, su habilidad **desaparece por completo** durante el resto de la partida, salvo que la propia habilidad diga lo contrario.

## Capitanes y escuadras

Una **escuadra** es un grupo de miniaturas del mismo tipo que actúan como **una sola unidad**. Solo un **Capitán** puede formar una escuadra; las unidades sin Capitán juegan siempre en solitario.

**Capitanes opcionales.** Antes de la partida, los jugadores acuerdan si se juega con Capitanes. Sin ellos, cada unidad es una sola miniatura y la partida es una escaramuza más rápida. Con ellos entran las escuadras y los ejércitos crecen.

### Formar una escuadra

Al montar la lista, cada Capitán puede llevar una escuadra de **un único tipo de unidad**, con hasta el número de miniaturas que indique su valor **Escuadra**. El Capitán no cuenta para ese máximo: con Escuadra 5, la escuadra tiene 5 miniaturas más el Capitán.

El Capitán **usa el perfil completo de la unidad que acompaña** (Movimiento, Vidas, Defensa y armas), así que a todos los efectos es un integrante más. Capitán y escuadra se despliegan juntos, ocupando un solo puesto de mando, y se activan juntos como una sola unidad.

Una escuadra es **una sola unidad** a todos los efectos: su habilidad de unidad se aplica una sola vez a toda la escuadra, salvo que indique lo contrario. Las escuadras no pueden formarse, dividirse ni fusionarse durante la partida, salvo mediante Refuerzos.

{{captainSquadDiagram}}

### Coherencia

Cada integrante debe estar a **1" o menos de al menos otro integrante**, y al menos uno de ellos a **1" o menos del Capitán**. Mientras esa cadena no se rompa, la escuadra puede adoptar la formación que quiera.

{{squadCoherenceDiagram}}

### Mover una escuadra

La escuadra se mueve **desde el Capitán**: primero se mueve él y después el resto se coloca a su alrededor, en coherencia. Ninguna miniatura puede quedar más lejos de lo que le permitiría su propio movimiento. Al Correr o Cargar, se tira **un solo dado** para toda la escuadra.

{{squadMovementDiagram}}

### Atacar con una escuadra

Para elegir a una escuadra como objetivo basta con que **uno de sus integrantes** sea visible y esté al alcance.

Cuando la escuadra ataca, todos sus integrantes, Capitán incluido, suman sus dados en **un solo ataque** contra el mismo objetivo. A distancia, solo aportan dados los integrantes que tengan línea de visión y alcance. Cuando una escuadra carga, basta con que un integrante llegue al contacto: todos sus integrantes, Capitán incluido, suman sus dados al ataque cuerpo a cuerpo. Después, **toda la escuadra** se separa 1" del defensor.

{{squadAttackDiagram}}

### Vidas en escuadras

Los impactos no bloqueados de un ataque se suman en un **único total**, que el defensor va asignando: elige una miniatura, le quita Vidas hasta eliminarla y, si sobran, elige la siguiente, hasta agotar el total. Los impactos **no pueden repartirse** entre varias miniaturas mientras la elegida siga en pie, y el **Capitán** es siempre el **último en recibirlos**.

{{squadDamageDiagram}}

### Refuerzos

En la fase de despliegue, el Capitán puede recibir **una miniatura** de su tipo desde la Reserva, colocada en coherencia y sin superar el máximo de la escuadra.

### Capitán sin escuadra

Si pierde a todos sus integrantes, el Capitán sigue en juego como una unidad más, **con el mismo perfil**, hasta ser destruido. Mediante Refuerzos solo puede recibir miniaturas de ese mismo tipo.

## Equipamiento

El equipamiento son ventajas de un solo uso que el ejército compra antes de la partida, pagando el **Valor** que indique cada una. No pertenece a ninguna unidad: **cualquier unidad aliada**, incluido el Héroe, puede usarlo. Cada equipamiento indica en su **Momento** cuándo se usa:

- **Fase de despliegue:** se usa durante la fase de despliegue.
- **Ocupa la activación:** la unidad lo usa en lugar de Avanzar, Correr o Cargar. Esa activación no puede hacer nada más.
- **Al disparar, Al cargar, Al atacar cuerpo a cuerpo o Al atacar:** se añade al ataque de la unidad en el momento de hacerlo. "Al atacar" sirve tanto a distancia como cuerpo a cuerpo.
- **Al recibir un ataque:** se usa cuando una unidad enemiga ataca a la unidad, a distancia o cuerpo a cuerpo, aunque sea la fase del rival.

Cada equipamiento se usa **una sola vez**. Después se descarta y no puede volver a utilizarse.

{{equipmentTimingDiagram}}

---

# Preparar la partida

## Puestos de mando

Los puestos de mando son posiciones estratégicas repartidas por el campo de batalla. Además de ser objetivos a conquistar, son los únicos puntos desde donde las unidades pueden desplegarse. El número de puestos y su colocación los determina la misión o el modo de juego.

Un puesto de mando puede ser cualquier cosa que los jugadores acuerden: un token, una moneda, un edificio o una zona delimitada del tablero. Lo único importante es que **todos tengan claro dónde empieza y dónde acaba** antes de empezar. Si se usa un área, los jugadores acuerdan su tamaño al montar la mesa; como referencia, un círculo de unas **3" de radio** funciona bien. Para indicar quién controla cada puesto basta con colocar al lado una banderilla, un dado del color del jugador o cualquier marcador, que se sustituye cuando el rival lo reconquista.

### Cuartel General

Cada jugador tiene obligatoriamente un **Cuartel General**, que funciona como un puesto de mando normal a efectos de control y despliegue.

### Control de un puesto

Una unidad está **dentro** de un puesto cuando la mitad o más de su peana está en su área, o en contacto con él si se representa con un marcador.

Al final de cada turno se revisa cada puesto. Si solo hay unidades de un jugador, lo controla ese jugador. Si hay unidades de ambos, lo controla el que sume **más Valor** en él. Una escuadra aporta el Valor de todos sus integrantes que estén dentro del puesto. Si no hay ninguna unidad, o hay empate, el puesto sigue siendo de quien lo tuviera.

Las unidades de rol Pesado y Fuego pesado no aportan Valor *(ver Roles)*.

{{commandPostDiagram}}

## Escenografía

Antes de empezar la partida, los jugadores acuerdan qué tipo es cada elemento de escenografía. Solo hay **dos tipos**, y lo acordado manda durante toda la partida, aunque una miniatura asome un poco.

**Escenografía de bloqueo.** Paredes, edificios, rocas grandes: todo lo que se considere un muro. **Bloquea la línea de visión por completo**, así que no se puede disparar a través de ella aunque asome parte de la miniatura. Tampoco se puede atravesar: hay que rodearla o trepar por ella *(ver Terreno y obstáculos)*.

**Escenografía de cobertura.** Muros bajos, barricadas, cajas o setos. No bloquea la línea de visión y cualquier unidad puede atravesarla, pero protege a quien se pega a ella *(ver Cobertura)*.

## Quién empieza

Al comienzo de la partida, cada jugador tira **1D6** y el resultado más alto juega primero (si hay empate, se repite la tirada). Ese orden se mantiene **durante toda la partida**. Con más de dos jugadores, se juega de mayor a menor resultado.

## Reserva

**Todas las unidades empiezan la partida en la Reserva**, fuera del campo de batalla. Van entrando durante la **fase de despliegue** de cada turno, por los puestos de mando que controles *(ver Fase de despliegue)*. Algunas tienen habilidades especiales de despliegue, como **Avanzadilla**.

*Cuantos más puestos domines, más rápido te llegan los refuerzos.*

## Despliegue inicial

La fase de despliegue del primer turno es el **despliegue inicial**. Funciona igual que cualquier otra, con una excepción: **la primera unidad en salir es siempre el Héroe**.

---

# Estructura del turno

Una partida de ZeroLore se divide en **turnos**. Cada turno empieza con la **fase de despliegue**, en la que los jugadores sacan refuerzos de su Reserva. Después, cada jugador juega su **fase**: activa todas sus unidades, una tras otra, y cuando termina le toca al siguiente. Cuando todos han jugado su fase, el turno termina.

{{turnStructureDiagram}}

## Fase de despliegue

Al comienzo de cada turno, siguiendo el orden de juego, cada jugador puede sacar de su **Reserva** **una sola unidad por cada puesto de mando que controle**, colocada en contacto con él o dentro de su área. Nunca más de una por puesto y turno, aunque haya sitio de sobra.

No se puede desplegar en un puesto ocupado por unidades enemigas, y la unidad tiene que **caber físicamente** junto al puesto: si no hay espacio, no puede entrar por ahí. Las unidades desplegadas **pueden activarse ese mismo turno**, y las que no se desplieguen siguen en Reserva.

{{deploymentPhaseDiagram}}

## Activaciones

Durante su fase, el jugador activa sus unidades **de una en una**, en el orden que quiera. Activar una unidad significa elegirla, realizar con ella una **opción de activación** y resolver por completo sus efectos antes de pasar a la siguiente.

Una unidad activada **no puede volver a activarse** ese turno. Para llevar el control, se puede marcar con cualquier elemento. En las partidas por equipos, los jugadores del mismo bando pueden coordinarse brevemente antes de actuar.

{{activationDiagram}}

## Opciones de activación

Cada vez que una unidad se activa, elige **una** de estas tres opciones:

- **Avanzar:** se mueve hasta su **Movimiento** y después puede **disparar**. También puede quedarse quieta y disparar.
- **Correr:** tira 1D6 y se mueve hasta su **Movimiento + el resultado**. No puede atacar.
- **Cargar:** elige una unidad enemiga, tira 1D6 y se mueve hasta su **Movimiento + el resultado** hacia ella para atacarla cuerpo a cuerpo *(ver Combate cuerpo a cuerpo)*.

Disparar después de moverse no tiene ninguna penalización, salvo que una regla diga lo contrario.

{{activationOptionsDiagram}}

## Fin del turno

Cuando todos los jugadores han jugado su fase, el turno termina. Se resuelven los efectos que indiquen hacerlo al final del turno, se calcula el **control de los puestos de mando** y se cuentan los puntos. La puntuación, las condiciones de victoria y la preparación de la partida se detallan en el documento de **Misiones**.

---

# Movimiento

Estas reglas se aplican siempre que una opción de activación o una regla permita desplazar una unidad.

## Moverse

Al Avanzar, Correr o Cargar, la unidad se mueve en cualquier dirección y puede rodear obstáculos, pero nunca a **menos de 1"** de una unidad enemiga, salvo al Cargar.

## Terreno y obstáculos

Las unidades pueden rodear obstáculos libremente o trepar por ellos si su movimiento les permite alcanzar la altura. Para trepar, la unidad se mueve hasta tocar la base del obstáculo con su peana y después mide la altura que quiere subir, que también consume movimiento. Bajar también consume movimiento, igual que subir.

Algunas unidades pueden trepar **en diagonal**: miden directamente desde donde están hasta el punto al que suben, sin tener que tocar antes la base del obstáculo. Lo indica su habilidad de unidad, como **Brinco**.

Las unidades de rol Pesado y Fuego pesado no pueden trepar *(ver Roles)*.

{{climbingDiagram}}

---

# Combate

## Secuencia de ataque

Todo ataque, a distancia o cuerpo a cuerpo, se resuelve igual y siempre en este orden:

1. **Elegir objetivo.** Una unidad enemiga dentro del Alcance del arma. A distancia hace falta además línea de visión; cuerpo a cuerpo, haber llegado al contacto con la carga. Solo se puede atacar a un objetivo, salvo que una regla diga lo contrario.
2. **Tirar los dados de ataque.** Tantos como indique el valor de Ataques del arma.
3. **Impactar.** Cada dado que iguale o supere la **Precisión** del arma impacta; los demás fallan.
4. **Defensa.** El defensor tira un dado por cada impacto. Cada resultado que iguale o supere su **Defensa**, con la cobertura y los demás modificadores aplicados *(ver Modificadores)*, bloquea ese impacto.
5. **Quitar Vidas.** Cada impacto no bloqueado quita **1 Vida**.

Cuando una unidad pierde todas sus Vidas, se retira del juego como destruida.

{{attackSequenceDiagram}}

## Combate a distancia

Las unidades atacan a distancia con el arma a distancia de su perfil.

### Disparar

Al **Avanzar**, la unidad puede realizar un ataque a distancia. Para hacerlo necesita **línea de visión** con el objetivo y que esté dentro del **Alcance** de su arma. El ataque se resuelve con la **Secuencia de ataque**.

### Línea de visión

Una unidad tiene línea de visión si, desde **cualquier punto del cuerpo de la miniatura** (no desde el arma ni la peana), puede ver **cualquier parte** de la miniatura objetivo. Las unidades ven en **360 grados**: la orientación de la miniatura no importa.

Hay dos cosas que siempre cortan la línea de visión: la **escenografía de bloqueo**, aunque asome parte de la miniatura *(ver Escenografía)*, y otra miniatura, aliada o enemiga, que tape **por completo** al objetivo.

{{lineOfSightDiagram}}

## Combate cuerpo a cuerpo

La **única forma de atacar cuerpo a cuerpo es Cargar**. Fuera de una carga, ninguna unidad puede acercarse a **menos de 1"** de una unidad enemiga, y cualquier movimiento que acabe en contacto con un enemigo es una carga.

### Cargar

Primero elige la unidad enemiga a la que carga y después tira **1D6**: puede desplazarse hasta su **Movimiento + el resultado** hacia ella. No tiene que usar toda la distancia: si el enemigo está cerca, le basta con llegar. Si alcanza al objetivo, coloca su peana en contacto y lo ataca con su arma de cuerpo a cuerpo. Si no llega, se queda donde haya llegado y su activación termina.

### Ataque cuerpo a cuerpo

Al llegar al contacto, la unidad ataca con su arma cuerpo a cuerpo siguiendo la **Secuencia de ataque**. Después **se separa 1"** del defensor y su activación termina. Ninguna unidad se queda enganchada.

*Ejemplo: tus Infantes (Movimiento 5") cargan contra unos Hostigadores (Defensa 4+) a 6". Tiran 1D6 y sacan un 3: pueden moverse hasta 8", así que llegan. Atacan y tiran sus 3 dados con Precisión 3+: sacan 1, 4 y 5, así que impactan dos. Los Hostigadores tiran Defensa por esos dos impactos: sacan 2 y 5, y bloquean uno, así que pierden 1 Vida. Después tus Infantes se apartan 1".*

{{chargeDiagram}}

## Cobertura

Para estar en cobertura, la unidad tiene que tener **la peana en contacto** con un elemento de escenografía de cobertura, y este tiene que quedar **entre ella y el atacante**. Si no hay contacto, o si te atacan desde atrás o desde un lado sin el elemento en medio, no hay cobertura, aunque estés pegado a él.

Una unidad en cobertura **mejora en 1 su Defensa** (por ejemplo, de 4+ a 3+), tanto a distancia como cuerpo a cuerpo.

Una escuadra se beneficia de cobertura si **la mitad o más** de sus integrantes están en ella. Las unidades de rol Pesado y Fuego pesado nunca reciben cobertura *(ver Roles)*.

*Ejemplo: tus Hostigadores (Defensa 4+) están pegados a un muro bajo. Si una unidad enemiga les carga desde el otro lado del muro, tiran Defensa con 3+.*

{{coverDiagram}}

---

# Consideraciones generales

**Olvidos.** Si un jugador olvida usar una habilidad, un equipamiento o declarar un efecto en su momento, se pierde, salvo que ambos jugadores acuerden lo contrario.

**Concordancia estética.** Aunque el juego es totalmente agnóstico con las miniaturas, se recomienda que cada ejército tenga coherencia visual. Aun así, cada jugador es libre de usar lo que quiera.

**Comunicar intenciones.** Explicar lo que vas a hacer en cada jugada ayuda a que la partida sea fluida y clara.

**Cronómetro.** Como variante opcional, se puede usar un cronómetro de 1 a 2 minutos por turno para agilizar las decisiones.

---

# Anexo: tamaño de peanas recomendado

ZeroLore es agnóstico en cuanto a miniaturas, pero se recomienda usar peanas proporcionales al tipo de unidad para mantener la coherencia visual y táctica.

| Tipo de unidad | Peana recomendada |
| --- | --- |
| Milicia, Hostigadores, Infantes, Explorador, Psíquico, Soporte | 25 – 32 mm redonda |
| Héroe, Asaltante | 32 – 40 mm redonda (ovalada para caballería) |
| Bastión, Paladín, Armas Pesadas | 40 – 50 mm redonda |
| Monstruos | 60 – 100 mm redonda u ovalada |
| Vehículos ligeros | Ovalada 75 × 42 – 90 × 52 mm |
| Vehículos pesados, Artillería | Ovalada grande (100 – 170 mm) o sin peana |
| Titán | 130 – 170 mm o sin peana |

Estas medidas son orientativas. Lo importante es que la peana sea coherente con el tamaño de la miniatura y no suponga una ventaja táctica injusta.
