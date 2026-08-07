/* =======================================================================
   DATOS DE LA LIGA — Categoría Quinta
   -----------------------------------------------------------------------
   Todo lo que cambia de una liga a otra vive aquí. El motor de cálculo
   (liga.js) NO se toca; solo se editan estos datos.
   ======================================================================= */

const CONFIG = {
  liga: "Liga Municipal de Fútbol de Cortázar, Gto.",
  lema: "Liga 100% Familiar",
  categoria: "Quinta",
  temporada: "Clausura 2026",

  // Reglas de puntuación de ESTA liga
  puntos:      { victoria: 2, empate: 1, derrota: 0 },
  golPorDefault: 1,   // al ganar por default se anota como 1 gol
  clasifican:  7,     // pasan los primeros 7

  // Orden de desempate (se aplica en ese orden)
  desempates: ["pts", "dif", "gf"],

  // Patrocinador que aparece al pie de cada imagen (editable en la app)
  patrocinador: {
    nombre: "Tu Tienda Deportiva",
    tel:    "461 000 0000",
    lema:   "Uniformes • Balones • Tacos"
  }
};

/* Base tras la JORNADA 25 — tal cual la hoja de posiciones.
   OJO: los puntos ya incluyen los ajustes por default (símbolos ✓/X),
   por eso 'pts' se guarda directo y NO se recalcula desde jg/je.        */
const BASE = [
  { equipo: "Huizache",        jg: 19, je: 1, jp: 5,  gf: 64, gc: 30,  pts: 40 },
  { equipo: "Papirrines",      jg: 16, je: 6, jp: 3,  gf: 81, gc: 33,  pts: 39 },
  { equipo: "Dep. Victoria",   jg: 16, je: 6, jp: 3,  gf: 79, gc: 27,  pts: 38 },
  { equipo: "Dep. Jaguares",   jg: 16, je: 3, jp: 6,  gf: 72, gc: 42,  pts: 36 },
  { equipo: "Dep. San Miguel", jg: 12, je: 7, jp: 6,  gf: 50, gc: 39,  pts: 33 },
  { equipo: "Dep. América",    jg: 12, je: 6, jp: 7,  gf: 58, gc: 47,  pts: 31 },
  { equipo: "Sparta",          jg: 12, je: 5, jp: 8,  gf: 91, gc: 55,  pts: 29 },
  { equipo: "Santa Fe",        jg: 12, je: 4, jp: 9,  gf: 69, gc: 57,  pts: 28 },
  { equipo: "AC Milan",        jg: 11, je: 4, jp: 10, gf: 70, gc: 55,  pts: 26 },
  { equipo: "U de G",          jg: 11, je: 3, jp: 11, gf: 47, gc: 53,  pts: 26 },
  { equipo: "Dep. Cruz Azul",  jg: 9,  je: 4, jp: 12, gf: 49, gc: 56,  pts: 22 },
  { equipo: "At. Magueyes",    jg: 8,  je: 3, jp: 14, gf: 38, gc: 70,  pts: 18 },
  { equipo: "Naseza",          jg: 6,  je: 3, jp: 16, gf: 27, gc: 64,  pts: 15 },
  { equipo: "Esforza Alameda", jg: 6,  je: 0, jp: 19, gf: 29, gc: 69,  pts: 9  },
  { equipo: "Socios",          jg: 3,  je: 2, jp: 20, gf: 24, gc: 100, pts: 7  }
  // Liverpool se retiró: no aparece en la tabla; sus partidos son default del rival.
];

/* Jornadas. Cada partido: local(loc) gl - gv visitante(vis).
   gl/gv en null = todavía NO se juega (pendiente de captura).
   def: "loc" o "vis" marca que fue ganado por default (se muestra el sello). */
const JORNADAS = [
  { num: 26, fecha: "17 may 2026", partidos: [
    { loc: "Papirrines",      gl: 1,  gv: 0,  vis: "Liverpool",       def: "loc" },
    { loc: "AC Milan",        gl: 3,  gv: 0,  vis: "U de G" },
    { loc: "Dep. América",    gl: 2,  gv: 2,  vis: "Huizache" },
    { loc: "Dep. Cruz Azul",  gl: 8,  gv: 1,  vis: "Esforza Alameda" },
    { loc: "Santa Fe",        gl: 0,  gv: 0,  vis: "Dep. Victoria" },
    { loc: "At. Magueyes",    gl: 1,  gv: 6,  vis: "Dep. San Miguel" },
    { loc: "Sparta",          gl: 7,  gv: 1,  vis: "Socios" },
    { loc: "Naseza",          gl: 0,  gv: 1,  vis: "Dep. Jaguares" }
  ]},
  { num: 27, fecha: "24 may 2026", partidos: [
    { loc: "Papirrines",      gl: 6,  gv: 0,  vis: "AC Milan" },
    { loc: "Dep. América",    gl: 1,  gv: 0,  vis: "Liverpool",       def: "loc" },
    { loc: "Dep. Cruz Azul",  gl: 4,  gv: 3,  vis: "U de G" },
    { loc: "Santa Fe",        gl: 1,  gv: 1,  vis: "Huizache" },
    { loc: "At. Magueyes",    gl: 8,  gv: 8,  vis: "Esforza Alameda" },
    { loc: "Sparta",          gl: 2,  gv: 11, vis: "Dep. Victoria" },
    { loc: "Naseza",          gl: 0,  gv: 1,  vis: "Dep. San Miguel" },
    { loc: "Dep. Jaguares",   gl: 6,  gv: 0,  vis: "Socios" }
  ]},
  { num: 28, fecha: "31 may 2026", partidos: [
    { loc: "Papirrines",      gl: 2,  gv: 0,  vis: "Dep. América" },
    { loc: "Dep. Cruz Azul",  gl: 0,  gv: 3,  vis: "AC Milan" },
    { loc: "Santa Fe",        gl: 1,  gv: 0,  vis: "Liverpool",       def: "loc" },
    { loc: "At. Magueyes",    gl: 1,  gv: 0,  vis: "U de G" },
    { loc: "Sparta",          gl: 1,  gv: 5,  vis: "Huizache" },
    { loc: "Naseza",          gl: 4,  gv: 8,  vis: "Esforza Alameda" },
    { loc: "Dep. Jaguares",   gl: 1,  gv: 2,  vis: "Dep. Victoria" },
    { loc: "Socios",          gl: 0,  gv: 1,  vis: "Dep. San Miguel" }
  ]},
  { num: 29, fecha: "07 jun 2026", partidos: [
    { loc: "Papirrines",      gl: 7,  gv: 0,  vis: "Dep. Cruz Azul" },
    { loc: "Santa Fe",        gl: 2,  gv: 1,  vis: "Dep. América" },
    { loc: "At. Magueyes",    gl: 5,  gv: 2,  vis: "AC Milan" },
    { loc: "Sparta",          gl: 1,  gv: 0,  vis: "Liverpool",       def: "loc" },
    { loc: "Naseza",          gl: 0,  gv: 1,  vis: "U de G" },
    { loc: "Dep. Jaguares",   gl: 1,  gv: 0,  vis: "Huizache" },
    { loc: "Socios",          gl: 1,  gv: 10, vis: "Esforza Alameda" },
    { loc: "Dep. San Miguel", gl: 2,  gv: 1,  vis: "Dep. Victoria" }
  ]},
  // Jornada 30 = rol final. 3 defaults ya resueltos; 5 partidos PENDIENTES de captura.
  { num: 30, fecha: "21 jun 2026", partidos: [
    { loc: "Papirrines",      gl: null, gv: null, vis: "Santa Fe",        hora: "8:00",  campo: "D-3" },
    { loc: "At. Magueyes",    gl: 1,    gv: 0,    vis: "Dep. Cruz Azul",  def: "loc" },
    { loc: "Sparta",          gl: null, gv: null, vis: "Dep. América",    hora: "16:00", campo: "Calzada 2" },
    { loc: "Naseza",          gl: 0,    gv: 1,    vis: "AC Milan",        def: "vis" },
    { loc: "Dep. Jaguares",   gl: 1,    gv: 0,    vis: "Liverpool",       def: "loc" },
    { loc: "Socios",          gl: null, gv: null, vis: "U de G",          hora: "10:00", campo: "Calzada 2" },
    { loc: "Dep. San Miguel", gl: null, gv: null, vis: "Huizache",       hora: "12:00", campo: "Huizache" },
    { loc: "Dep. Victoria",   gl: null, gv: null, vis: "Esforza Alameda", hora: "8:00",  campo: "Sintético" }
  ]}
];

/* Goleadores de la Quinta (hasta la J25, tal cual la hoja). Editable en la app. */
const GOLEADORES = [
  { jugador: "Miguel Flores",        equipo: "Papirrines",      goles: 35 },
  { jugador: "Luis Fernando León",   equipo: "Huizache",        goles: 31 },
  { jugador: "Juan Adrián Vázquez",  equipo: "AC Milan",        goles: 22 },
  { jugador: "Giovanni Sandoval",    equipo: "Dep. Victoria",   goles: 21 },
  { jugador: "Eder Campos",          equipo: "Dep. San Miguel", goles: 20 }
];
