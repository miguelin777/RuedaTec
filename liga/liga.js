/* =======================================================================
   MOTOR DE LA LIGA — cálculo de tabla, goleadores, captura e imagen.
   No depende de librerías externas: corre en cualquier navegador.
   ======================================================================= */

const LS_RESULTADOS = "liga_quinta_resultados_v1";
const LS_GOLEADORES = "liga_quinta_goleadores_v1";
const LS_PATRON     = "liga_quinta_patrocinador_v1";

/* --- Estado (se puede editar y se guarda en el navegador) --- */
let RESULTADOS = cargar(LS_RESULTADOS, JORNADAS);
let GOLES      = cargar(LS_GOLEADORES, GOLEADORES);
let PATRON     = cargar(LS_PATRON, CONFIG.patrocinador);
let jornadaVista = 29; // por defecto muestra la última ya jugada

function cargar(clave, porDefecto) {
  try {
    const guardado = localStorage.getItem(clave);
    return guardado ? JSON.parse(guardado) : structuredClone(porDefecto);
  } catch (e) { return structuredClone(porDefecto); }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
}

/* -----------------------------------------------------------------------
   1) CÁLCULO DE LA TABLA  (aplica las reglas de la liga)
   ----------------------------------------------------------------------- */
function calcularTabla(hastaJornada) {
  // Copia de la base tras la J25 (con sus puntos ya ajustados)
  const map = {};
  BASE.forEach(b => map[b.equipo] = { ...b });

  for (const j of RESULTADOS) {
    if (j.num > hastaJornada) break;
    for (const p of j.partidos) aplicarPartido(map, p);
  }

  const filas = Object.values(map).map(t => ({
    ...t, jj: t.jg + t.je + t.jp, dif: t.gf - t.gc
  }));

  const orden = CONFIG.desempates;
  filas.sort((a, b) => {
    for (const c of orden) { if (b[c] !== a[c]) return b[c] - a[c]; }
    return a.equipo.localeCompare(b.equipo);
  });
  return filas;
}

function aplicarPartido(map, p) {
  if (p.gl == null || p.gv == null) return;           // aún no se juega
  const L = map[p.loc], V = map[p.vis];               // (Liverpool no está en map: se ignora)
  const W = CONFIG.puntos;
  if (L) {
    L.gf += p.gl; L.gc += p.gv;
    if (p.gl > p.gv) { L.jg++; L.pts += W.victoria; }
    else if (p.gl === p.gv) { L.je++; L.pts += W.empate; }
    else { L.jp++; L.pts += W.derrota; }
  }
  if (V) {
    V.gf += p.gv; V.gc += p.gl;
    if (p.gv > p.gl) { V.jg++; V.pts += W.victoria; }
    else if (p.gv === p.gl) { V.je++; V.pts += W.empate; }
    else { V.jp++; V.pts += W.derrota; }
  }
}

function jugada(num) {              // ¿la jornada tiene al menos un partido jugado?
  const j = RESULTADOS.find(x => x.num === num);
  return j && j.partidos.some(p => p.gl != null && p.gv != null);
}

/* -----------------------------------------------------------------------
   2) PINTAR LA TABLA
   ----------------------------------------------------------------------- */
function renderTabla() {
  const filas = calcularTabla(jornadaVista);
  const cont = document.getElementById("tabla-body");
  cont.innerHTML = "";
  filas.forEach((t, i) => {
    const pos = i + 1;
    const tr = document.createElement("tr");
    if (pos <= CONFIG.clasifican) tr.classList.add("clasifica");
    if (pos === CONFIG.clasifican) tr.classList.add("corte");
    tr.innerHTML = `
      <td class="pos">${pos}</td>
      <td class="eq">${t.equipo}</td>
      <td class="tnum">${t.jj}</td>
      <td class="tnum d-none-sm">${t.jg}</td>
      <td class="tnum d-none-sm">${t.je}</td>
      <td class="tnum d-none-sm">${t.jp}</td>
      <td class="tnum d-none-sm">${t.gf}</td>
      <td class="tnum d-none-sm">${t.gc}</td>
      <td class="tnum dif">${t.dif > 0 ? "+" + t.dif : t.dif}</td>
      <td class="tnum pts">${t.pts}</td>`;
    cont.appendChild(tr);
  });
  document.getElementById("tabla-titulo").textContent =
    jugada(jornadaVista) ? `Tabla tras la Jornada ${jornadaVista}`
                         : `Tabla (Jornada ${jornadaVista} pendiente)`;
}

/* -----------------------------------------------------------------------
   3) GOLEADORES
   ----------------------------------------------------------------------- */
function renderGoleadores() {
  const cont = document.getElementById("gol-body");
  cont.innerHTML = "";
  [...GOLES].sort((a, b) => b.goles - a.goles).slice(0, 10).forEach((g, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="pos">${i + 1}</td>
      <td class="eq">${g.jugador}<span class="sub">${g.equipo}</span></td>
      <td class="tnum pts">${g.goles}</td>`;
    cont.appendChild(tr);
  });
}

/* -----------------------------------------------------------------------
   4) CAPTURA DE RESULTADOS
   ----------------------------------------------------------------------- */
function renderCaptura() {
  const j = RESULTADOS.find(x => x.num === jornadaVista);
  const cont = document.getElementById("captura-body");
  cont.innerHTML = "";
  j.partidos.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "cap-row";
    const sello = p.def ? `<span class="sello">default</span>` : "";
    const detalle = (p.hora || p.campo)
      ? `<span class="detalle">${p.hora ? p.hora + " · " : ""}${p.campo || ""}</span>` : "";
    row.innerHTML = `
      <span class="cap-eq loc">${p.loc}</span>
      <input class="cap-in" type="number" min="0" inputmode="numeric"
             data-i="${idx}" data-lado="gl" value="${p.gl ?? ""}" aria-label="Goles ${p.loc}">
      <span class="cap-vs">-</span>
      <input class="cap-in" type="number" min="0" inputmode="numeric"
             data-i="${idx}" data-lado="gv" value="${p.gv ?? ""}" aria-label="Goles ${p.vis}">
      <span class="cap-eq vis">${p.vis} ${sello}${detalle}</span>`;
    cont.appendChild(row);
  });
  document.getElementById("captura-titulo").textContent = `Capturar Jornada ${jornadaVista}`;
}

function guardarCaptura() {
  const j = RESULTADOS.find(x => x.num === jornadaVista);
  document.querySelectorAll("#captura-body .cap-in").forEach(inp => {
    const i = +inp.dataset.i, lado = inp.dataset.lado;
    const v = inp.value.trim();
    j.partidos[i][lado] = v === "" ? null : Math.max(0, parseInt(v, 10) || 0);
  });
  guardar(LS_RESULTADOS, RESULTADOS);
  renderTodo();
  aviso("✅ Jornada guardada. La tabla ya se actualizó.");
}

/* -----------------------------------------------------------------------
   5) IMAGEN PARA WHATSAPP  (dibujada con Canvas, sin librerías)
   ----------------------------------------------------------------------- */
function generarImagen() {
  const filas = calcularTabla(jornadaVista);
  const W = 1080;
  const padX = 56, headH = 250, rowH = 60, footH = 150;
  const H = headH + rowH * filas.length + footH + 24;

  const cv = document.getElementById("lienzo");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");

  // Fondo verde noche
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0C1E15"); bg.addColorStop(1, "#0E241A");
  c.fillStyle = bg; c.fillRect(0, 0, W, H);

  // Líneas de cancha (sutiles)
  c.strokeStyle = "rgba(255,255,255,.05)"; c.lineWidth = 2;
  for (let x = 78; x < W; x += 90) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }

  // Encabezado
  c.textBaseline = "alphabetic";
  c.fillStyle = "#7FD3A6";
  c.font = "700 26px system-ui, Arial";
  c.fillText(CONFIG.lema.toUpperCase(), padX, 70);
  c.fillStyle = "#FBFDFB";
  c.font = "800 52px system-ui, Arial";
  c.fillText(`Categoría ${CONFIG.categoria}`, padX, 130);
  c.fillStyle = "#C9D8CE";
  c.font = "600 30px system-ui, Arial";
  const sub = jugada(jornadaVista) ? `Tabla tras la Jornada ${jornadaVista}` : `Jornada ${jornadaVista}`;
  c.fillText(sub, padX, 176);

  // Franja de columnas
  const yCols = headH - 22;
  c.fillStyle = "#8FB6A0"; c.font = "700 24px system-ui, Arial";
  c.textAlign = "left";  c.fillText("#", padX, yCols);
  c.fillText("EQUIPO", padX + 56, yCols);
  c.textAlign = "right";
  c.fillText("PJ", W - 300, yCols);
  c.fillText("DIF", W - 170, yCols);
  c.fillText("PTS", W - padX, yCols);

  // Filas
  filas.forEach((t, i) => {
    const pos = i + 1;
    const y = headH + i * rowH;
    const clasifica = pos <= CONFIG.clasifican;
    if (clasifica) { c.fillStyle = "rgba(18,144,90,.14)"; c.fillRect(0, y, W, rowH); }
    // línea de corte de clasificación
    if (pos === CONFIG.clasifican) {
      c.strokeStyle = "#12905A"; c.lineWidth = 4;
      c.beginPath(); c.moveTo(0, y + rowH); c.lineTo(W, y + rowH); c.stroke();
    }
    const midY = y + rowH / 2 + 10;
    // posición
    c.textAlign = "left";
    c.fillStyle = clasifica ? "#7FD3A6" : "#6E7A70";
    c.font = "700 30px system-ui, Arial";
    c.fillText(String(pos), padX, midY);
    // equipo
    c.fillStyle = "#EFF3EE";
    c.font = "600 32px system-ui, Arial";
    c.fillText(t.equipo, padX + 56, midY);
    // números
    c.textAlign = "right";
    c.fillStyle = "#B9CFC2"; c.font = "500 30px ui-monospace, monospace";
    c.fillText(String(t.jj), W - 300, midY);
    c.fillText((t.dif > 0 ? "+" : "") + t.dif, W - 170, midY);
    c.fillStyle = clasifica ? "#FBFDFB" : "#C9D8CE";
    c.font = "800 34px ui-monospace, monospace";
    c.fillText(String(t.pts), W - padX, midY);
  });

  // Etiqueta "clasificación"
  const yCorte = headH + CONFIG.clasifican * rowH;
  c.textAlign = "left"; c.fillStyle = "#12905A"; c.font = "700 20px system-ui, Arial";
  c.fillText(`▲  ZONA DE CLASIFICACIÓN (primeros ${CONFIG.clasifican})`, padX, yCorte + 30);

  // Footer PATROCINADOR (ámbar)
  const yF = H - footH;
  c.fillStyle = "#B9770F"; c.fillRect(0, yF, W, footH);
  c.fillStyle = "#3A2606"; c.font = "700 22px system-ui, Arial";
  c.textAlign = "left"; c.fillText("PATROCINA", padX, yF + 42);
  c.fillStyle = "#FFF7E8"; c.font = "800 44px system-ui, Arial";
  c.fillText(PATRON.nombre, padX, yF + 90);
  c.fillStyle = "#3A2606"; c.font = "600 26px system-ui, Arial";
  c.fillText(`${PATRON.lema}`, padX, yF + 126);
  c.textAlign = "right"; c.fillStyle = "#FFF7E8"; c.font = "700 32px ui-monospace, monospace";
  c.fillText(`WhatsApp ${PATRON.tel}`, W - padX, yF + 90);

  // Mostrar preview + habilitar acciones
  const url = cv.toDataURL("image/png");
  const img = document.getElementById("preview");
  img.src = url; img.style.display = "block";
  document.getElementById("preview-hint").style.display = "none";
  document.getElementById("btn-descargar").href = url;
  document.getElementById("btn-descargar").download =
    `tabla-quinta-j${jornadaVista}.png`;
  document.getElementById("acciones-img").style.display = "flex";
  cv._blob = () => new Promise(res => cv.toBlob(res, "image/png"));
}

async function compartirImagen() {
  const cv = document.getElementById("lienzo");
  try {
    const blob = await cv._blob();
    const file = new File([blob], `tabla-quinta-j${jornadaVista}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Tabla ${CONFIG.categoria} J${jornadaVista}`,
        text: `${CONFIG.lema} · Categoría ${CONFIG.categoria} · Tabla tras J${jornadaVista}`
      });
    } else {
      aviso("Tu navegador no comparte directo. Usa “Descargar” y envíala por WhatsApp.");
    }
  } catch (e) { /* usuario canceló */ }
}

/* -----------------------------------------------------------------------
   6) PATROCINADOR editable
   ----------------------------------------------------------------------- */
function cargarPatronUI() {
  document.getElementById("p-nombre").value = PATRON.nombre;
  document.getElementById("p-tel").value    = PATRON.tel;
  document.getElementById("p-lema").value   = PATRON.lema;
}
function guardarPatron() {
  PATRON = {
    nombre: document.getElementById("p-nombre").value.trim() || "Tu Tienda Deportiva",
    tel:    document.getElementById("p-tel").value.trim(),
    lema:   document.getElementById("p-lema").value.trim()
  };
  guardar(LS_PATRON, PATRON);
  aviso("✅ Patrocinador guardado. Vuelve a generar la imagen.");
}

/* -----------------------------------------------------------------------
   Utilidades y arranque
   ----------------------------------------------------------------------- */
function aviso(msg) {
  const el = document.getElementById("aviso");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 3500);
}

function resetTodo() {
  if (!confirm("¿Borrar tus capturas y volver a los datos originales?")) return;
  [LS_RESULTADOS, LS_GOLEADORES, LS_PATRON].forEach(k => localStorage.removeItem(k));
  RESULTADOS = structuredClone(JORNADAS);
  GOLES = structuredClone(GOLEADORES);
  PATRON = structuredClone(CONFIG.patrocinador);
  cargarPatronUI(); renderTodo();
  aviso("↺ Datos restaurados.");
}

function renderTodo() { renderTabla(); renderGoleadores(); renderCaptura(); }

function initSelector() {
  const sel = document.getElementById("sel-jornada");
  RESULTADOS.forEach(j => {
    const o = document.createElement("option");
    o.value = j.num; o.textContent = `Jornada ${j.num}`;
    sel.appendChild(o);
  });
  sel.value = jornadaVista;
  sel.addEventListener("change", () => { jornadaVista = +sel.value; renderTodo(); });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("liga-nombre").textContent = CONFIG.liga;
  document.getElementById("liga-cat").textContent = `Categoría ${CONFIG.categoria} · ${CONFIG.temporada}`;
  initSelector();
  cargarPatronUI();
  renderTodo();
  document.getElementById("btn-guardar").addEventListener("click", guardarCaptura);
  document.getElementById("btn-imagen").addEventListener("click", generarImagen);
  document.getElementById("btn-compartir").addEventListener("click", compartirImagen);
  document.getElementById("btn-patron").addEventListener("click", guardarPatron);
  document.getElementById("btn-reset").addEventListener("click", resetTodo);
});
