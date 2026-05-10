import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const w = (nombre, ataques, distancia, impactos, danio, danioCritico, habilidades = []) => ({
  nombre,
  ataques,
  distancia,
  impactos,
  danio,
  danio_critico: danioCritico,
  habilidades_arma: habilidades,
  valor_extra: 0,
})

const mw = (nombre, ataques, danio, danioCritico, habilidades = []) =>
  w(nombre, ataques, null, null, danio, danioCritico, habilidades)

const unit = (
  nombre,
  era,
  clase,
  movimiento,
  vidas,
  salvacion,
  velocidad,
  min,
  max,
  especialidad,
  valor,
  disparo,
  cuerpo,
  extra = {},
) => ({
  nombre_unidad: nombre,
  era,
  clase,
  ...extra,
  perfil: {
    movimiento,
    vidas,
    salvacion,
    velocidad,
    escuadra: { min, max },
    ...(extra.especialidad_escaramuza || extra.especialidad_escuadra
      ? {
          especialidad_escaramuza: extra.especialidad_escaramuza,
          especialidad_escuadra: extra.especialidad_escuadra,
        }
      : { especialidad }),
    valor,
  },
  armas: {
    disparo,
    cuerpo_a_cuerpo: cuerpo,
  },
})

const ordenFuture = [
  unit('Soldado Raso', 'Futuro', 'Línea', '6"', 4, '+4', 2, 4, 6, '-', 5, [w('Fusil estándar', '2D', '16"', '+4', '1', '2')], [mw('Puños', '1D', '1', '1')]),
  unit('Incendiarios', 'Futuro', 'Línea', '6"', 5, '+4', 3, 3, 6, '-', 7, [w('Lanzallamas', '1D6', '8"', '-', '1', '2', ['Directo'])], [mw('Cuchillo de combate', '2D', '1', '2')]),
  unit('Zapadores', 'Futuro', 'Línea', '6"', 5, '+4', 3, 3, 6, '-', 7, [w('Arma pesada', '1D6', '14"', '+5', '2', '2', ['Pesada']), w('Lanzacohetes', '2D', '18"', '+4', '2', '4', ['Anti 5+ (Vehículo)', 'Ataque especializado (Vehículo)'])], [mw('Cuchillo de zapador', '2D', '1', '2')]),
  unit('Infantes de Choque', 'Futuro', 'Línea', '6"', 5, '+4', 4, 4, 8, '-', 6, [w('Pistola reglamentaria', '1D', '8"', '+4', '1', '1', ['Pistolero'])], [mw('Mazo de guardia', '2D', '2', '3')]),
  unit('Guardias Blindados', 'Futuro', 'Élite', '5"', 8, '+3', 3, 1, 4, 'Cuando esta unidad no se mueve en su activación, reduce en 1 el daño de todos los ataques de Disparo recibidos ese turno (mín. 1).', 10, [w('Fusil de asalto blindado', '3D', '12"', '+3', '2', '3', ['Asaltante +1'])], [mw('Puños energía', '2D', '2', '3')]),
  unit('Médico de Campaña', 'Futuro', 'Élite', '6"', 5, '+4', 3, 1, 3, 'Una vez por activación, esta unidad puede gastar las 2 acciones para elegir una unidad aliada a 3". Esa unidad recupera D3 Vidas perdidas. No puede superar sus Vidas máximas. No puede usarse sobre Vehículos ni Titanes.', 8, [w('Pistola táctica', '2D', '10"', '+4', '1', '2', ['Pistolero'])], [mw('Cuchillo quirúrgico', '1D', '1', '2')]),
  unit('Francotiradores', 'Futuro', 'Élite', '6"', 6, '+4', 2, 2, 4, 'Si no se mueve durante su activación, sus ataques de Disparo ignoran cobertura.', 8, [w('Rifle de francotirador', '2D', '28"', '+3', '2', '3', ['Pesada', 'Ataque especializado (Línea, Élite)']), w('Rifle anti-material', '1D', '24"', '+4', '4', '6', ['Anti 5+ (Vehículo)', 'Ataque especializado (Vehículo, Monstruo)'])], [mw('Cuchillo de combate', '1D', '1', '2')]),
  unit('Vehículo de Reconocimiento', 'Futuro', 'Vehículo', '10"', 8, '+4', 2, 1, 3, 'Esta unidad vehículo puede ir en escuadras.', 10, [w('Ametralladora ligera', '3D', '16"', '+4', '1', '2', ['Asaltante +1'])], [mw('Embestida', '2D', '2', '3')]),
  unit('Tanque de Línea', 'Futuro', 'Vehículo', '6"', 18, '+3', 1, 1, 1, 'Puede usar dos acciones de disparo.', 14, [w('Ametralladora', '4D', '12"', '+3', '2', '3', ['Ataque especializado (Línea, Élite)']), w('Cañón principal', '2D', '20"', '+4', '4', '5', ['Explosiva'])], [mw('Golpe', '2D', '2', '3')]),
  unit('Artillería Pesada', 'Futuro', 'Vehículo', '-', 12, '+4', 1, 1, 1, 'Esta unidad no puede moverse. Cuando realiza un ataque de Disparo, gana +1 dado de ataque.', 13, [w('Cañón de asedio', '1D', '36"', '+4', '5', '7', ['Explosiva', 'Disparo parabólico']), w('Cañón electromagnético', '2D', '30"', '+3', '4', '5', ['Anti 5+ (Vehículo)', 'Ataque especializado (Vehículo, Monstruo)'])], [mw('Golpe de cañón', '1D', '1', '2')]),
  unit('General de Campaña', 'Futuro', 'Héroe', '6"', 10, '+3', 3, 1, 1, '-', 16, [w('Fusil de energía', '2D', '16"', '+3', '2', '4')], [mw('Espada de mando', '3D', '3', '4'), mw('Puño energético', '2D', '4', '5')], { especialidad_escaramuza: 'Una vez por turno puede designar una unidad aliada a 6" de este héroe para repetir todos los dados de Disparo fallidos.', especialidad_escuadra: 'Mientras este héroe forme parte de una escuadra, esa escuadra obtiene +1 dado de ataque en Disparo si no ha realizado ninguna acción de Movimiento durante su activación.' }),
  unit('Bastión de Asalto', 'Futuro', 'Titán', '3"', 32, '+3', 1, 1, 1, 'Esta unidad puede llevar dos armas a distancia y disparar dos veces en su acción de disparo. Si no se ha movido, gana +1 dado en ambos disparos.', 45, [w('Cañón de destrucción', '2D6', '28"', '+3', '4', '6', ['Explosiva']), w('Lanzamisiles orbitales', '2D', '24"', '+4', '3', '5', ['Explosiva'])], [mw('Puño de siege', '1D', '5', '7', ['Ataque Crítico'])], { max_armas_disparo: 2 }),
]

const ordenPast = [
  unit('Guardias de la Ciudad', 'Pasado', 'Línea', '5"', 4, '+5', 3, 3, 6, 'Si esta unidad recibe un ataque CaC mientras está en cobertura, el atacante no obtiene el bonus de carga en ese ataque.', 4, [w('Jabalina', '1D', '10"', '+5', '1', '2')], [mw('Lanza y escudo', '2D', '2', '3')]),
  unit('Arqueros del Reino', 'Pasado', 'Línea', '5"', 4, '+5', 3, 3, 6, 'Cuando esta unidad no se mueve en su activación, gana +1 dado en todos sus ataques de Disparo.', 6, [w('Arco largo', '2D', '20"', '+4', '1', '2', ['Precisión'])], [mw('Daga', '1D', '1', '2')]),
  unit('Lanceros', 'Pasado', 'Línea', '5"', 5, '+4', 3, 3, 6, 'Cuando esta unidad es objetivo de una carga enemiga, puede realizar un ataque gratuito CaC antes de que el atacante resuelva sus ataques.', 5, [w('Jabalina', '1D', '6"', '+5', '1', '2')], [mw('Lanza de formación', '3D', '2', '3')]),
  unit('Exploradores del Norte', 'Pasado', 'Línea', '6"', 4, '+5', 4, 2, 4, 'Puede moverse y disparar sin penalización por movimiento. Sus ataques de Disparo ignoran cobertura.', 6, [w('Arco de explorador', '2D', '16"', '+4', '1', '2')], [mw('Espada de explorador', '2D', '2', '3')]),
  unit('Guardia de la Ciudadela', 'Pasado', 'Élite', '4"', 8, '+3', 3, 1, 3, 'Cuando esta unidad no se mueve en su activación, reduce en 1 el daño de todos los ataques recibidos (mín. 1).', 11, [w('Ballesta de guardia', '2D', '16"', '+4', '2', '3', ['Pesada'])], [mw('Espada de guardia', '3D', '3', '4')]),
  unit('Caballería del Reino', 'Pasado', 'Élite', '10"', 7, '+4', 5, 1, 3, 'Cuando realiza una carga exitosa, gana +2D en CaC esa activación. Después de eliminar una unidad enemiga en CaC, puede realizar un movimiento gratuito de 3".', 11, [w('Lanza arrojadiza', '1D', '8"', '+4', '1', '2', ['Pistolero'])], [mw('Espada de caballería', '3D', '3', '5')]),
  unit('Ballesta de Asedio', 'Pasado', 'Vehículo', '3"', 10, '+4', 1, 1, 1, 'Sus ataques de Disparo ignoran cobertura. Puede repetir un dado de ataque de Disparo fallido por activación.', 12, [w('Ballesta gigante', '3D', '28"', '+3', '4', '6', ['Pesada', 'Anti 5+ (Vehículo)'])], [mw('Embestida', '1D', '1', '2')]),
  unit('Catapulta', 'Pasado', 'Vehículo', '3"', 10, '+4', 1, 1, 1, 'Puede disparar a objetivos sin línea de visión directa, ignorando obstáculos de terreno (pero no unidades).', 13, [w('Proyectil de catapulta', '1D6', '30"', '-', '3', '4', ['Explosiva', 'Disparo parabólico'])], [mw('Embestida', '1D', '1', '2')]),
  unit('Ariete Blindado', 'Pasado', 'Vehículo', '5"', 14, '+3', 1, 1, 1, 'Las unidades aliadas a 3" o menos cuentan como en cobertura. Cuando esta unidad realiza una carga, inflige D3 impactos automáticos de Daño 2.', 14, [], [mw('Ariete', '3D', '4', '6')]),
  unit('Troll Domado', 'Pasado', 'Monstruo', '6"', 16, '+4', 2, 1, 1, 'Al inicio de cada Fase de Iniciativa recupera 1 Vida (hasta su máximo). Cuando realiza una carga, inflige D3 impactos automáticos de Daño 2 antes del combate.', 13, [w('Roca arrojada', '1D', '12"', '+4', '3', '4')], [mw('Porrazo brutal', '3D', '5', '7')]),
  unit('Capitán del Reino', 'Pasado', 'Héroe', '5"', 8, '+3', 4, 1, 1, 'Las unidades aliadas a 6" pueden repetir un dado de ataque CaC fallido por activación. Una vez por turno puede otorgar a una unidad aliada a 8" una acción de movimiento gratuita.', 14, [w('Arco del capitán', '2D', '18"', '+3', '2', '3', ['Precisión'])], [mw('Espada del capitán', '3D', '3', '5', ['Ataque Crítico'])]),
  unit('Señor Soberano', 'Pasado', 'Titán', '4"', 28, '+2', 2, 1, 1, 'Las unidades aliadas a 8" repiten los dados de Salvación fallidos contra ataques de Disparo. Cuando esta unidad elimina una unidad enemiga en CaC, todas las unidades aliadas a 8" pueden realizar un movimiento gratuito de 2".', 42, [w('Arco del soberano', '3D', '24"', '+2', '3', '4', ['Precisión'])], [mw('Espada del soberano', '3D', '6', '8', ['Ataque Crítico'])]),
]

const caosFuture = [
  unit('Alimañas', 'Futuro', 'Línea', '8"', 3, '+5', 4, 4, 10, '-', 3, [w('Proyectil sucio', '1D', '8"', '+5', '1', '1')], [mw('Garras', '2D', '1', '2')]),
  unit('Asoladores', 'Futuro', 'Línea', '8"', 4, '+5', 5, 4, 6, 'En carga, esta unidad gana +1 dado de ataque en CaC durante esa activación.', 5, [w('Veneno arrojadizo', '1D', '6"', '+5', '1', '2')], [mw('Cuchillas de asalto', '3D', '1', '2')]),
  unit('Reventadores', 'Futuro', 'Línea', '7"', 3, '+6', 2, 3, 6, 'Cuando esta unidad es eliminada, antes de retirarla inflige D3 impactos automáticos de Daño 1/2 a todas las unidades a 2" (aliadas y enemigas).', 4, [], [mw('Cuerpo explosivo', '2D', '2', '4')]),
  unit('Saeteadores', 'Futuro', 'Línea', '6"', 4, '+5', 3, 3, 6, 'Puede disparar en la misma activación en que realiza una carga exitosa.', 6, [w('Espinas arrojadizas', '2D', '14"', '+4', '1', '2')], [mw('Garras cortantes', '2D', '1', '2')]),
  unit('Acorazados', 'Futuro', 'Élite', '5"', 9, '+3', 3, 1, 3, 'Al inicio de cada Fase de Iniciativa, si esta unidad no está trabada en CaC, recupera 1 Vida.', 11, [w('Proyectil ácido', '1D', '10"', '+4', '2', '3')], [mw('Mandíbulas acorazadas', '3D', '2', '3')]),
  unit('Devastadores', 'Futuro', 'Élite', '6"', 8, '+4', 4, 1, 3, 'Cuando esta unidad carga exitosamente, puede repetir todos los dados de ataque CaC fallidos en esa activación.', 10, [w('Lanzador de bilis', '1D6', '8"', '-', '2', '3', ['Directo'])], [mw('Garras devastadoras', '4D', '3', '5')]),
  unit('Jinetes del Apocalipsis', 'Futuro', 'Élite', '10"', 6, '+4', 5, 2, 4, 'En carga, gana +2 dados de ataque CaC. Si esta unidad elimina una unidad enemiga en CaC, puede moverse inmediatamente 2" de forma gratuita.', 9, [w('Espinas de montura', '1D', '6"', '+5', '1', '2', ['Pistolero'])], [mw('Lanza de montura', '3D', '2', '3')]),
  unit('Bestia de Carga', 'Futuro', 'Monstruo', '7"', 18, '+4', 2, 1, 1, 'Cuando esta unidad carga exitosamente, la unidad objetivo recibe D3 impactos automáticos de Daño 2/3 antes de resolver el ataque CaC.', 13, [w('Proyectiles espinosos', '2D', '10"', '+5', '1', '2')], [mw('Aplastamiento', '4D', '3', '4'), mw('Embestida', '2D', '4', '6', ['Anti 5+ (Vehículo)'])]),
  unit('Garrapato', 'Futuro', 'Monstruo', '5"', 20, '+4', 1, 1, 1, 'Las unidades aliadas de Línea a 6" pueden repetir los dados de salvación fallidos.', 14, [w('Enjambre de esporas', '1D6', '12"', '-', '2', '2', ['Directo', 'Impactos encadenados'])], [mw('Aguijón venenoso', '2D', '3', '4')]),
  unit('Corrosivo', 'Futuro', 'Monstruo', '6"', 14, '+5', 2, 1, 1, 'Cuando realiza un ataque de Disparo, los objetivos no pueden beneficiarse de cobertura.', 12, [w('Chorro ácido', '2D', '12"', '+4', '3', '5', ['Anti 5+ (Vehículo)', 'Ataque especializado (Vehículo, Monstruo)'])], [mw('Mandíbulas corrosivas', '2D', '3', '4')]),
  unit('Agente del Caos', 'Futuro', 'Héroe', '7"', 10, '+3', 5, 1, 1, '-', 15, [w('Proyectil vivo', '2D', '12"', '+4', '2', '3')], [mw('Garras del Señor', '4D', '3', '5'), mw('Colmillo del Alfa', '2D', '4', '6', ['Ataque Crítico'])], { especialidad_escaramuza: 'Las unidades aliadas a 6" ganan +1 dado de ataque en CaC. Cuando esta unidad elimina una unidad enemiga, todas las unidades aliadas a 6" pueden moverse inmediatamente 2" de forma gratuita.', especialidad_escuadra: 'Las unidades en escuadra con este héroe ganan +1 dado de ataque en CaC. Cuando la escuadra elimina una unidad enemiga, puede moverse inmediatamente 2" de forma gratuita.' }),
  unit('El Gran Devorador', 'Futuro', 'Titán', '4"', 26, '+3', 1, 1, 1, 'Cuando esta unidad elimina una unidad enemiga en CaC, recupera D3 Vidas inmediatamente. Una vez por turno, al inicio de su activación, puede devolver al juego una unidad aliada de Línea eliminada con la mitad de su escuadra mínima, colocándola dentro de 6" de esta unidad.', 42, [w('Escupitajo ácido', '2D6', '18"', '-', '3', '4', ['Directo']), w('Proyectil masivo', '2D', '20"', '+4', '5', '7', ['Explosiva'])], [mw('Aplastamiento titánico', '3D', '4', '6'), mw('Dientes del abismo', '2D', '5', '7', ['Ataque Crítico'])]),
]

const caosPast = [
  unit('Gretchins', 'Pasado', 'Línea', '5"', 3, '+6', 3, 4, 12, 'Cuando esta unidad tiene 6 o más miniaturas en juego, sus ataques CaC infligen +1 Daño.', 3, [w('Pistola chatarra', '1D', '8"', '+5', '1', '1')], [mw('Garfio orco', '1D', '1', '2')]),
  unit('Orcos de Pelea', 'Pasado', 'Línea', '5"', 5, '+5', 4, 3, 6, 'Cuando esta unidad realiza una carga exitosa, cada dado de ataque CaC que saque 6 añade +1 dado de ataque adicional (Impactos encadenados).', 5, [w('Arco orco', '1D', '10"', '+5', '1', '2')], [mw('Hacha de guerra', '2D', '3', '4')]),
  unit('Goblins Flecheros', 'Pasado', 'Línea', '6"', 3, '+6', 3, 4, 8, 'Esta unidad puede disparar a unidades enemigas trabadas en CaC con aliados sin penalización por fuego amigo (el daño se aplica igualmente a cualquier unidad trabada en ese combate).', 4, [w('Arco goblin', '2D', '14"', '+5', '1', '2')], [mw('Cuchillo goblin', '1D', '1', '2')]),
  unit('Matones Orcos', 'Pasado', 'Línea', '5"', 6, '+4', 5, 2, 4, 'Cuando esta unidad realiza una carga, puede repetir los dos dados de distancia. Si la carga falla por 1" o menos, tiene éxito igualmente.', 6, [], [mw('Mandoble orco', '3D', '3', '5')]),
  unit('Grandes Jefes', 'Pasado', 'Élite', '5"', 9, '+3', 5, 1, 3, 'Mientras esta unidad esté trabada en CaC, las unidades aliadas de Línea a 4" o menos ganan +1D en sus ataques CaC.', 12, [w('Pistolón orco', '2D', '10"', '+4', '2', '3')], [mw('Hacha del jefe', '4D', '4', '6', ['Ataque Crítico'])]),
  unit('Jinetes de Jabalí', 'Pasado', 'Élite', '9"', 7, '+4', 5, 1, 3, 'Cuando realiza una carga exitosa, gana +2D en CaC esa activación. Si elimina su objetivo en CaC, puede inmediatamente cargar a otra unidad enemiga a 6" o menos.', 10, [w('Lanza arrojadiza', '1D', '8"', '+5', '1', '2')], [mw('Lanza de jabalí', '3D', '3', '4')]),
  unit('Chamanes Greenskin', 'Pasado', 'Élite', '5"', 6, '+5', 4, 1, 2, 'Una vez por turno, en lugar de atacar, elige entre: (a) infligir 1D3 impactos automáticos de Daño 1 a una unidad enemiga a 12", o (b) dar +1D de ataque a una unidad aliada a 8" hasta el final del turno.', 9, [w('Rayo Waaagh', '2D', '14"', '+4', '2', '3')], [mw('Bastón mágico', '2D', '2', '3')]),
  unit('Troll de Guerra', 'Pasado', 'Monstruo', '6"', 16, '+4', 3, 1, 1, 'Al inicio de cada Fase de Iniciativa recupera 1 Vida (hasta su máximo). Cuando realiza una carga, inflige D3 impactos automáticos de Daño 2 antes del combate.', 13, [w('Roca arrojada', '1D', '12"', '+4', '3', '4')], [mw('Porrazo', '3D', '5', '7')]),
  unit('Gran Araña', 'Pasado', 'Monstruo', '8"', 12, '+5', 4, 1, 1, 'Las unidades enemigas trabadas en CaC con esta unidad no pueden retirarse ni destrabarse. Cuando esta unidad elimina una unidad en CaC, puede moverse 3" de forma gratuita.', 11, [], [mw('Mordisco venenoso', '3D', '2', '4', ['Ataque Crítico'])]),
  unit('Maquinaria de Guerra Orka', 'Pasado', 'Monstruo', '4"', 14, '+4', 1, 1, 1, 'Cuando dispara, puede apuntar a un punto del tablero sin línea de visión directa: todas las unidades en 3" del punto sufren el ataque (ignorando obstáculos de terreno).', 14, [w('Catapulta orka', '1D6', '24"', '-', '3', '5', ['Explosiva', 'Disparo parabólico'])], [mw('Embestida', '2D', '2', '3')]),
  unit('Warboss', 'Pasado', 'Héroe', '5"', 10, '+3', 6, 1, 1, 'Las unidades aliadas a 6" ganan +1D en ataques CaC. Cuando esta unidad elimina una unidad enemiga en CaC, puede realizar un movimiento gratuito de 3" y declarar inmediatamente una carga si hay otro objetivo.', 16, [w('Cañón de brazo', '2D', '12"', '+3', '2', '3')], [mw('Choppa gigante', '4D', '4', '6', ['Ataque Crítico'])]),
  unit('Gran Destructor', 'Pasado', 'Titán', '5"', 30, '+3', 2, 1, 1, 'Al inicio de cada Fase de Iniciativa recupera 1D3 Vidas. Cuando realiza una carga, inflige D3 impactos automáticos de Daño 3. Las unidades aliadas de Línea a 6" pueden repetir dados de CaC fallidos.', 44, [w('Cañones bestiales', '2D6', '22"', '+3', '4', '5', ['Explosiva'])], [mw('Puño aplastador', '3D', '7', '9', ['Ataque Crítico'])]),
]

const legadoFuture = [
  unit('Guardianes Eternos', 'Futuro', 'Línea', '5"', 5, '+3', 3, 3, 5, 'Cuando esta unidad es objetivo de un ataque de Disparo, puede moverse hasta 2" antes de que se resuelvan los dados. Si el atacante pierde línea de visión, el ataque se cancela.', 7, [w('Rifle de resonancia', '2D', '16"', '+4', '2', '3')], [mw('Lanza espectral', '2D', '3', '4')]),
  unit('Custodios', 'Futuro', 'Línea', '5"', 6, '+3', 2, 3, 5, 'Esta unidad puede retirarse de combate cuerpo a cuerpo sin realizar chequeo de retirada.', 8, [w('Lanzador de energía', '2D', '14"', '+4', '2', '3')], [mw('Escudo y espada', '2D', '2', '4')]),
  unit('Templarios', 'Futuro', 'Línea', '6"', 6, '+3', 5, 3, 5, 'Si esta unidad no dispara en su activación, gana +1 dado en todos sus ataques CaC.', 9, [], [mw('Espadas de energía', '3D', '3', '4')]),
  unit('Inmortales', 'Futuro', 'Élite', '4"', 10, '+2', 3, 1, 3, 'Cuando esta unidad es destruida, antes de retirarla realiza un ataque gratuito (disparo o CaC).', 14, [w('Cañón de aniquilación', '3D', '18"', '+3', '3', '4', ['Pesada', 'Ataque especializado (Élite, Héroe, Titán)'])], [mw('Guadaña espectral', '2D', '4', '6', ['Ataque Crítico'])]),
  unit('Acechadores del Vacío', 'Futuro', 'Élite', '7"', 7, '+3', 4, 2, 4, 'Una vez por turno, como acción gratuita, puede intercambiar su posición con otra unidad aliada a 12" o menos (ninguna puede estar trabada).', 10, [w('Fusil del vacío', '2D', '20"', '+3', '2', '3', ['Precisión'])], [mw('Daga del vacío', '2D', '3', '4')]),
  unit('Sombras del Vacío', 'Futuro', 'Élite', '7"', 7, '+3', 5, 1, 3, 'Esta unidad no puede ser objetivo de ataques de Disparo si el atacante está a más de 8".', 12, [], [mw('Cuchilla espectral', '3D', '4', '5', ['Ataque Crítico'])]),
  unit('Coloso del Legado', 'Futuro', 'Vehículo', '5"', 20, '+2', 1, 1, 1, 'Cuando esta unidad es destruida, antes de retirarla puede realizar dos ataques gratuitos (disparo o CaC).', 19, [w('Cañón de calor', '2D6', '20"', '+3', '3', '4', ['Explosiva']), w('Rayo de disrupción', '3D', '16"', '-', '2', '3', ['Directo'])], [mw('Pisotón colosal', '3D', '3', '5')]),
  unit('Centinela Espectral', 'Futuro', 'Vehículo', '6"', 16, '+3', 1, 1, 1, 'Sus ataques de Disparo ignoran cobertura. Cuando una unidad aliada es destruida a 12" o menos, puede realizar inmediatamente un disparo gratuito contra el atacante responsable.', 15, [w('Cañón espectral', '3D', '24"', '+3', '3', '4', ['Precisión'])], [mw('Aplastar', '2D', '2', '3')]),
  unit('Portador del Vacío', 'Futuro', 'Vehículo', '8"', 12, '+3', 2, 1, 1, 'Una vez por partida, al inicio de su activación, puede retirarse del tablero y reaparecer en cualquier punto del borde de despliegue de LEGADO.', 13, [w('Baterías de energía', '4D', '18"', '+3', '2', '3', ['Ataque especializado (Línea, Élite)']), w('Cañón de disrupción', '2D', '20"', '+3', '3', '5', ['Anti 5+ (Vehículo)'])], [mw('Golpe espectral', '2D', '2', '3')]),
  unit('Etéreo del Vacío', 'Futuro', 'Monstruo', '6"', 14, '+2', 3, 1, 1, 'Las unidades aliadas a 6" reducen en 1 el daño de todos los ataques recibidos (mín. 1).', 16, [w('Pulso etéreo', '2D', '14"', '+3', '3', '5')], [mw('Golpe etéreo', '3D', '4', '6', ['Ataque Crítico'])]),
  unit('Oráculo del Legado', 'Futuro', 'Héroe', '6"', 9, '+2', 4, 1, 1, '-', 18, [w('Lanza del oráculo', '3D', '22"', '+3', '2', '3', ['Precisión'])], [mw('Espada del oráculo', '3D', '3', '4'), mw('Toque del vacío', '2D', '4', '6', ['Ataque Crítico'])], { especialidad_escaramuza: 'Una vez por turno puede intercambiar su posición con cualquier unidad aliada a 18" o menos (no puede estar trabada). Las unidades aliadas a 6" destruidas realizan su ataque de Caída gloriosa con +1 dado.', especialidad_escuadra: 'Una vez por turno la escuadra puede intercambiar su posición con cualquier unidad aliada a 18" o menos. Las unidades en escuadra destruidas realizan su ataque de Caída gloriosa con +1 dado.' }),
  unit('El Ancestral', 'Futuro', 'Titán', '3"', 30, '+2', 1, 1, 1, 'Al inicio de cada Fase de Iniciativa, si esta unidad tiene menos de la mitad de sus Vidas, recupera D3 Vidas. Cuando es destruida, antes de retirarla realiza tres ataques gratuitos (disparo o CaC).', 48, [w('Cañón del juicio final', '2D6', '30"', '+2', '5', '7', ['Explosiva', 'Precisión']), w('Batería del Legado', '2D', '26"', '+3', '3', '5', ['Explosiva'])], [mw('Espada del fin', '2D', '6', '8', ['Ataque Crítico'])]),
]

const legadoPast = [
  unit('Escuderos', 'Pasado', 'Línea', '5"', 4, '+5', 3, 3, 6, 'Mientras esta unidad esté a 6" o menos de un Héroe aliado, su Salvación mejora en 1 (5+ pasa a 4+).', 5, [w('Arco corto', '1D', '12"', '+5', '1', '2')], [mw('Espada y escudo', '2D', '2', '3')]),
  unit('Hombres de Armas', 'Pasado', 'Línea', '5"', 5, '+4', 3, 3, 6, 'Cuando esta unidad no se mueve en su activación, reduce en 1 el daño de todos los ataques CaC recibidos (mín. 1).', 6, [w('Ballesta', '2D', '16"', '+4', '1', '2')], [mw('Lanza larga', '2D', '2', '3')]),
  unit('Cruzados', 'Pasado', 'Línea', '5"', 5, '+4', 5, 2, 5, 'Cuando esta unidad realiza una carga exitosa, el primer ataque CaC de esa activación ignora la Salvación del defensor.', 7, [], [mw('Espada de cruzada', '3D', '3', '4')]),
  unit('Monjes Combatientes', 'Pasado', 'Línea', '6"', 5, '+5', 5, 2, 5, 'Cuando esta unidad carga (no lleva armas de disparo), puede repetir todos los dados de ataque CaC fallidos esa activación.', 6, [], [mw('Puños sagrados', '3D', '2', '3', ['Impactos encadenados'])]),
  unit('Caballeros del Sagrado', 'Pasado', 'Élite', '8"', 8, '+3', 5, 1, 3, 'Cuando realiza una carga exitosa, la Salvación del defensor empeora en 1 durante los ataques de esa activación (ej.: 3+ pasa a 4+).', 13, [], [mw('Lanza de caballería', '4D', '4', '5')]),
  unit('Paladines Sagrados', 'Pasado', 'Élite', '5"', 9, '+2', 4, 1, 3, 'Cuando esta unidad es destruida, antes de retirarla realiza un ataque gratuito CaC. Las unidades aliadas a 4" reducen en 1 el daño recibido (mín. 1).', 14, [w('Martillo lanzado', '1D', '10"', '+4', '2', '3')], [mw('Martillo sagrado', '3D', '4', '5', ['Ataque Crítico'])]),
  unit('Arqueros del Templo', 'Pasado', 'Élite', '5"', 7, '+4', 3, 1, 3, 'Sus ataques de Disparo ignoran cobertura. Cuando dispara a una unidad que realizó una carga ese turno, gana +2D de ataque.', 10, [w('Arco sagrado', '3D', '22"', '+3', '2', '3', ['Precisión'])], [mw('Daga del templo', '2D', '2', '3')]),
  unit('Coloso de Piedra', 'Pasado', 'Vehículo', '4"', 18, '+3', 1, 1, 1, 'Cuando esta unidad es destruida, antes de retirarla puede realizar dos ataques gratuitos (disparo o CaC). Las unidades aliadas a 6" reducen en 1 el daño recibido (mín. 1).', 16, [w('Puños catapulta', '2D6', '18"', '+3', '3', '4', ['Explosiva'])], [mw('Puñetazo de piedra', '3D', '5', '7')]),
  unit('Portador de la Fe', 'Pasado', 'Vehículo', '5"', 14, '+3', 2, 1, 1, 'Las unidades aliadas a 6" obtienen +1 a su Salvación (ej.: 5+ pasa a 4+). Cuando una unidad aliada a 8" es destruida, puede realizar inmediatamente un disparo gratuito contra el atacante responsable.', 14, [w('Lanzador de reliquias', '3D', '18"', '+3', '2', '3')], [mw('Pisotón sagrado', '2D', '3', '4')]),
  unit('Ángel Caído', 'Pasado', 'Monstruo', '8"', 14, '+3', 3, 1, 1, 'Esta unidad ignora penalizaciones de terreno al moverse y al cargar. Cuando realiza una carga, puede moverse sobre unidades y obstáculos.', 15, [w('Lanza celestial', '3D', '20"', '+3', '3', '5')], [mw('Espada divina', '3D', '5', '7', ['Ataque Crítico'])]),
  unit('Gran Maestre', 'Pasado', 'Héroe', '5"', 9, '+2', 5, 1, 1, 'Una vez por turno puede consagrar a una unidad aliada a 12": hasta el final del turno sus ataques CaC infligen +1 Daño y sus críticos +1 Daño crítico. Las unidades aliadas a 6" pueden repetir un dado de Salvación fallido por activación.', 18, [w('Martillo del maestre', '2D', '14"', '+3', '2', '3')], [mw('Espadón sagrado', '4D', '4', '6', ['Ataque Crítico'])]),
  unit('El Arcángel', 'Pasado', 'Titán', '6"', 28, '+2', 3, 1, 1, 'Al inicio de cada Fase de Iniciativa recupera 1 Vida. Cuando elimina una unidad enemiga en CaC, todas las unidades aliadas a 8" recuperan 1 Vida. Cuando es destruida, antes de retirarla realiza tres ataques gratuitos (disparo o CaC).', 46, [w('Rayo divino', '2D6', '26"', '+2', '5', '7', ['Explosiva', 'Precisión'])], [mw('Espada del juicio', '3D', '7', '9', ['Ataque Crítico'])]),
]

const factionMeta = {
  orden: {
    nombre: 'Orden',
    estilo_juego: 'Facción disciplinada y metódica centrada en el control del territorio y el fuego sostenido. Sus unidades rinden mejor cuando se mantienen en posición y coordinación táctica. Sacrifica movilidad a cambio de potencia y precisión. Ideal para jugadores que disfrutan de planificar cada turno, establecer líneas defensivas y castigar al enemigo con unidades equilibradas.',
    habilidades_faccion: JSON.parse(fs.readFileSync(path.join(root, 'src/data/factions/jsonFaccionesES/orden.json'), 'utf8')).faccion.habilidades_faccion,
    unidades: [...ordenFuture, ...ordenPast],
  },
  caos: {
    nombre: 'Caos',
    estilo_juego: 'Facción de oleadas y presión constante, diseñada para saturar al enemigo con números y nunca dejar de avanzar. Sus unidades de Línea son las más baratas del juego: caen con facilidad pero reaparecen turno tras turno desde los puestos de mando. El cuerpo a cuerpo y el control del espacio son su arma principal. Ideal para jugadores que disfrutan de la presión sostenida, el desgaste progresivo y el caos controlado.',
    habilidades_faccion: JSON.parse(fs.readFileSync(path.join(root, 'src/data/factions/jsonFaccionesES/caos.json'), 'utf8')).faccion.habilidades_faccion,
    unidades: [...caosFuture, ...caosPast],
  },
  legado: {
    nombre: 'Legado',
    estilo_juego: 'Facción de control y posicionamiento que apuesta por la calidad sobre la cantidad. Sus unidades son las más resistentes del juego pero dispone de menos. Usa portales para teleportarse donde el rival no espera, revive a sus caídos con probabilidad y contraataca incluso al morir. El control del tablero es suyo si el jugador es paciente. Ideal para jugadores estratégicos que disfrutan de la microgestión, el posicionamiento y hacer que cada unidad cuente.',
    habilidades_faccion: [
      {
        id: 'portales-del-legado',
        nombre: 'Portales del Legado',
        coste: 10,
        descripcion_escaramuza: 'Una vez por turno, una unidad aliada puede gastar 1 acción para intercambiar su posición con otra unidad aliada de tipo Línea, Élite o Héroe a 18" o menos. Ninguna de las dos puede estar trabada.',
        descripcion_escuadra: 'Una vez por turno, una escuadra o unidad aliada puede gastar 1 acción para intercambiar su posición con otra unidad aliada de tipo Línea, Élite o Héroe a 18" o menos. Ninguna de las dos puede estar trabada.',
      },
      {
        id: 'no-conocen-la-muerte',
        nombre: 'No conocen la muerte',
        coste: 6,
        descripcion_escaramuza: 'Cuando una unidad de Línea o Élite es eliminada, al inicio de la siguiente Fase de Iniciativa tira 1D6: con resultado 5+ la unidad regresa en su posición actual con la mitad de sus Vidas máximas.',
        descripcion_escuadra: 'Cuando una escuadra de Línea o Élite es eliminada, al inicio de la siguiente Fase de Iniciativa tira 1D6: con resultado 5+ la escuadra regresa en su posición actual con la mitad de sus Vidas máximas.',
      },
      {
        id: 'caida-gloriosa',
        nombre: 'Caída gloriosa',
        coste: 7,
        descripcion_escaramuza: 'Cuando cualquier unidad del Legado es destruida, antes de retirarla puede realizar inmediatamente un ataque gratuito (disparo o CaC según su posición) siguiendo las reglas normales de ataque.',
        descripcion_escuadra: 'Cuando cualquier escuadra o unidad del Legado es destruida, antes de retirarla puede realizar inmediatamente un ataque gratuito (disparo o CaC según su posición) siguiendo las reglas normales de ataque.',
      },
      {
        id: 'designacion-ancestral',
        nombre: 'Designación ancestral',
        coste: 5,
        descripcion_escaramuza: 'Una vez por turno, designa una unidad enemiga como objetivo ancestral. Hasta el final del turno, todos los ataques CaC de unidades de Legado contra ese objetivo consiguen crítico con 5+ en lugar de 6.',
        descripcion_escuadra: 'Una vez por turno, designa una unidad o escuadra enemiga como objetivo ancestral. Hasta el final del turno, todos los ataques CaC de unidades y escuadras de Legado contra ese objetivo consiguen crítico con 5+ en lugar de 6.',
      },
      {
        id: 'combate-a-muerte',
        nombre: 'Combate a muerte',
        coste: 7,
        descripcion_escaramuza: 'Al inicio de la Fase de Iniciativa, designa una unidad aliada. Si esa unidad entra en combate cuerpo a cuerpo ese turno, ya sea cargando o siendo cargada, todas las unidades trabadas en ese combate no pueden retirarse ni destrabarse por ningún medio hasta que una de las dos unidades quede eliminada.',
        descripcion_escuadra: 'Al inicio de la Fase de Iniciativa, designa una escuadra aliada. Si esa escuadra entra en combate cuerpo a cuerpo ese turno, ya sea cargando o siendo cargada, todas las escuadras o unidades trabadas en ese combate no pueden retirarse ni destrabarse por ningún medio hasta que una de las dos escuadras o unidades quede eliminada.',
      },
    ],
    unidades: [...legadoFuture, ...legadoPast],
  },
}

const nameMap = {
  'Soldado Raso': 'Line Soldier',
  Incendiarios: 'Incendiaries',
  Zapadores: 'Sappers',
  'Infantes de Choque': 'Shock Troopers',
  'Guardias Blindados': 'Armored Guards',
  'Médico de Campaña': 'Field Medic',
  Francotiradores: 'Snipers',
  'Vehículo de Reconocimiento': 'Recon Vehicle',
  'Tanque de Línea': 'Line Tank',
  'Artillería Pesada': 'Heavy Artillery',
  'General de Campaña': 'Field General',
  'Bastión de Asalto': 'Assault Bastion',
  'Guardias de la Ciudad': 'City Guards',
  'Arqueros del Reino': 'Realm Archers',
  Lanceros: 'Spearmen',
  'Exploradores del Norte': 'Northern Scouts',
  'Guardia de la Ciudadela': 'Citadel Guard',
  'Caballería del Reino': 'Realm Cavalry',
  'Ballesta de Asedio': 'Siege Ballista',
  Catapulta: 'Catapult',
  'Ariete Blindado': 'Armored Ram',
  'Troll Domado': 'Tamed Troll',
  'Capitán del Reino': 'Captain of the Realm',
  'Señor Soberano': 'Sovereign Lord',
  Alimañas: 'Vermin',
  Asoladores: 'Ravagers',
  Reventadores: 'Bursters',
  Saeteadores: 'Darters',
  Acorazados: 'Armored Beasts',
  Devastadores: 'Devastators',
  'Jinetes del Apocalipsis': 'Riders of the Apocalypse',
  'Bestia de Carga': 'Charge Beast',
  Garrapato: 'Squig',
  Corrosivo: 'Corrosive',
  'Agente del Caos': 'Agent of Chaos',
  'El Gran Devorador': 'The Great Devourer',
  'Orcos de Pelea': 'Fight Orcs',
  'Goblins Flecheros': 'Goblin Archers',
  'Matones Orcos': 'Orc Bruisers',
  'Grandes Jefes': 'Big Bosses',
  'Jinetes de Jabalí': 'Boar Riders',
  'Chamanes Greenskin': 'Greenskin Shamans',
  'Troll de Guerra': 'War Troll',
  'Gran Araña': 'Great Spider',
  'Maquinaria de Guerra Orka': 'Ork War Machine',
  'Gran Destructor': 'Great Destroyer',
  'Guardianes Eternos': 'Eternal Guardians',
  Custodios: 'Custodians',
  Templarios: 'Templars',
  Inmortales: 'Immortals',
  'Acechadores del Vacío': 'Void Stalkers',
  'Sombras del Vacío': 'Void Shadows',
  'Coloso del Legado': 'Legacy Colossus',
  'Centinela Espectral': 'Spectral Sentinel',
  'Portador del Vacío': 'Void Carrier',
  'Etéreo del Vacío': 'Void Ethereal',
  'Oráculo del Legado': 'Legacy Oracle',
  'El Ancestral': 'The Ancestral',
  Escuderos: 'Squires',
  'Hombres de Armas': 'Men-at-Arms',
  Cruzados: 'Crusaders',
  'Monjes Combatientes': 'Fighting Monks',
  'Caballeros del Sagrado': 'Knights of the Sacred',
  'Paladines Sagrados': 'Sacred Paladins',
  'Arqueros del Templo': 'Temple Archers',
  'Coloso de Piedra': 'Stone Colossus',
  'Portador de la Fe': 'Bearer of Faith',
  'Ángel Caído': 'Fallen Angel',
  'Gran Maestre': 'Grand Master',
  'El Arcángel': 'The Archangel',
}

const classMap = {
  Línea: 'Line',
  Élite: 'Elite',
  Vehículo: 'Vehicle',
  Monstruo: 'Monster',
  Héroe: 'Hero',
  Titán: 'Titan',
}

const abilityMap = {
  Pesada: 'Heavy',
  Directo: 'Direct',
  Pistolero: 'Gunslinger',
  Explosiva: 'Explosive',
  Precisión: 'Precision',
  'Disparo parabólico': 'Parabolic Shot',
  'Impactos encadenados': 'Chained Hits',
  'Ataque Crítico': 'Critical Attack',
}

const translateAbility = (value) =>
  Object.entries(abilityMap).reduce((next, [es, en]) => next.replaceAll(es, en), value)
    .replaceAll('Vehículo', 'Vehicle')
    .replaceAll('Monstruo', 'Monster')
    .replaceAll('Línea', 'Line')
    .replaceAll('Élite', 'Elite')
    .replaceAll('Héroe', 'Hero')
    .replaceAll('Titán', 'Titan')
    .replaceAll('Ataque especializado', 'Specialized Attack')
    .replaceAll('Asaltante', 'Assailant')

const translateUnit = (unit) => ({
  ...unit,
  nombre_unidad: nameMap[unit.nombre_unidad] || unit.nombre_unidad,
  era: unit.era === 'Futuro' ? 'Future' : unit.era === 'Pasado' ? 'Past' : unit.era,
  clase: classMap[unit.clase] || unit.clase,
  perfil: {
    ...unit.perfil,
    especialidad: unit.perfil.especialidad,
    especialidad_escaramuza: unit.perfil.especialidad_escaramuza,
    especialidad_escuadra: unit.perfil.especialidad_escuadra,
  },
  armas: {
    disparo: unit.armas.disparo.map((weapon) => ({
      ...weapon,
      habilidades_arma: weapon.habilidades_arma.map(translateAbility),
    })),
    cuerpo_a_cuerpo: unit.armas.cuerpo_a_cuerpo.map((weapon) => ({
      ...weapon,
      habilidades_arma: weapon.habilidades_arma.map(translateAbility),
    })),
  },
})

const enFactionMeta = {
  orden: JSON.parse(fs.readFileSync(path.join(root, 'src/data/factions/jsonFaccionesEN/orden.en.json'), 'utf8')).faccion,
  caos: JSON.parse(fs.readFileSync(path.join(root, 'src/data/factions/jsonFaccionesEN/caos.en.json'), 'utf8')).faccion,
  legado: JSON.parse(fs.readFileSync(path.join(root, 'src/data/factions/jsonFaccionesEN/legado.en.json'), 'utf8')).faccion,
}

enFactionMeta.legado.habilidades_faccion = [
  {
    id: 'portales-del-legado',
    nombre: 'Legacy Portals',
    coste: 10,
    descripcion_escaramuza: 'Once per turn, an allied unit may spend 1 action to swap positions with another allied Line, Elite, or Hero unit within 18". Neither unit may be engaged.',
    descripcion_escuadra: 'Once per turn, an allied squad or unit may spend 1 action to swap positions with another allied Line, Elite, or Hero unit within 18". Neither one may be engaged.',
  },
  {
    id: 'no-conocen-la-muerte',
    nombre: 'They Know No Death',
    coste: 6,
    descripcion_escaramuza: 'When a Line or Elite unit is eliminated, roll 1D6 at the start of the next Initiative Phase. On a 5+, that unit returns in its current position with half its maximum Wounds.',
    descripcion_escuadra: 'When a Line or Elite squad is eliminated, roll 1D6 at the start of the next Initiative Phase. On a 5+, that squad returns in its current position with half its maximum Wounds.',
  },
  {
    id: 'caida-gloriosa',
    nombre: 'Glorious Fall',
    coste: 7,
    descripcion_escaramuza: 'When any Legacy unit is destroyed, before removing it, it may immediately make one free attack (Shooting or melee, depending on its position) following the normal attack rules.',
    descripcion_escuadra: 'When any Legacy squad or unit is destroyed, before removing it, it may immediately make one free attack (Shooting or melee, depending on its position) following the normal attack rules.',
  },
  {
    id: 'designacion-ancestral',
    nombre: 'Ancestral Designation',
    coste: 5,
    descripcion_escaramuza: 'Once per turn, designate an enemy unit as the ancestral target. Until the end of that turn, Legacy units attacking that target in melee score critical hits on 5+ instead of 6.',
    descripcion_escuadra: 'Once per turn, designate an enemy unit or squad as the ancestral target. Until the end of that turn, Legacy units and squads attacking that target in melee score critical hits on 5+ instead of 6.',
  },
  {
    id: 'combate-a-muerte',
    nombre: 'Fight to the Death',
    coste: 7,
    descripcion_escaramuza: 'At the start of the Initiative Phase, designate one allied unit. If that unit enters melee this turn, whether by charging or being charged, all units engaged in that combat cannot retreat or disengage by any means until one of the two units is eliminated.',
    descripcion_escuadra: 'At the start of the Initiative Phase, designate one allied squad. If that squad enters melee this turn, whether by charging or being charged, all squads or units engaged in that combat cannot retreat or disengage by any means until one of the two squads or units is eliminated.',
  },
]

for (const [id, meta] of Object.entries(factionMeta)) {
  const esData = {
    id,
    faccion: {
      nombre: meta.nombre,
      estilo_juego: meta.estilo_juego,
      seleccion_habilidades: 'multiple',
      habilidades_faccion: meta.habilidades_faccion,
    },
    unidades: meta.unidades,
  }

  const enData = {
    id,
    faccion: {
      ...enFactionMeta[id],
      habilidades_faccion: enFactionMeta[id].habilidades_faccion.length === meta.habilidades_faccion.length
        ? enFactionMeta[id].habilidades_faccion
        : meta.habilidades_faccion,
    },
    unidades: meta.unidades.map(translateUnit),
  }

  fs.writeFileSync(path.join(root, `src/data/factions/jsonFaccionesES/${id}.json`), `${JSON.stringify(esData, null, 2)}\n`)
  fs.writeFileSync(path.join(root, `src/data/factions/jsonFaccionesEN/${id}.en.json`), `${JSON.stringify(enData, null, 2)}\n`)
}
