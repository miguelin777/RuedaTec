/* =======================================================================
   MOTOR DE LA LIGA — cálculo de tabla, goleadores, rol, captura e imágenes.
   Sin librerías externas: corre en cualquier navegador.
   ======================================================================= */

/* Multi-categoría: cada categoría tiene sus propios equipos/rol/goleadores.
   El patrocinador es común a toda la liga. */
const K_CATS = "liga_cats_v1", K_ACTIVA = "liga_cat_activa_v1", LS_PATRON = "liga_patron_v1";
let LS_EQUIPOS, LS_RESULTADOS, LS_GOLEADORES;
function setCatKeys(cat) {
  LS_EQUIPOS = `liga_cat_${cat}_equipos`;
  LS_RESULTADOS = `liga_cat_${cat}_resultados`;
  LS_GOLEADORES = `liga_cat_${cat}_goleadores`;
}
function seedEq(cat)  { return cat === CONFIG.categoria ? BASE : []; }
function seedRes(cat) { return cat === CONFIG.categoria ? JORNADAS : []; }
function seedGol(cat) { return cat === CONFIG.categoria ? GOLEADORES : []; }
/* Migra los datos de la versión de una sola categoría (claves liga_quinta_*). */
function migrarViejo() {
  const cat = CONFIG.categoria;
  if (localStorage.getItem("liga_quinta_equipos_v1") && !localStorage.getItem(`liga_cat_${cat}_equipos`)) {
    ["equipos", "resultados", "goleadores"].forEach(s => {
      const v = localStorage.getItem(`liga_quinta_${s}_v1`);
      if (v) localStorage.setItem(`liga_cat_${cat}_${s}`, v);
    });
    const p = localStorage.getItem("liga_quinta_patrocinador_v1");
    if (p && !localStorage.getItem(LS_PATRON)) localStorage.setItem(LS_PATRON, p);
  }
}

let CATS = cargar(K_CATS, [CONFIG.categoria]);
if (!Array.isArray(CATS) || !CATS.length) CATS = [CONFIG.categoria];
let catActiva = cargar(K_ACTIVA, CATS[0]);
if (!CATS.includes(catActiva)) catActiva = CATS[0];
setCatKeys(catActiva);
migrarViejo();

let EQUIPOS    = cargar(LS_EQUIPOS, seedEq(catActiva));
let RESULTADOS = cargar(LS_RESULTADOS, seedRes(catActiva));
let GOLES      = cargar(LS_GOLEADORES, seedGol(catActiva));
let PATRON     = cargar(LS_PATRON, CONFIG.patrocinador);
let jornadaVista = jornadaPorDefecto();
/* Última jornada completa (todos sus partidos jugados); si no, la última con algún
   partido jugado; si no, la última del rol. Evita el "29" mágico. */
function jornadaPorDefecto() {
  if (!RESULTADOS.length) return 1;
  const completas = RESULTADOS.filter(j => j.partidos.length && j.partidos.every(p => p.gl != null && p.gv != null));
  if (completas.length) return completas[completas.length - 1].num;
  const jugadas = RESULTADOS.filter(j => j.partidos.some(p => p.gl != null && p.gv != null));
  if (jugadas.length) return jugadas[jugadas.length - 1].num;
  return RESULTADOS[RESULTADOS.length - 1].num;
}

function cargar(clave, porDefecto) {
  try {
    const g = localStorage.getItem(clave);
    return g ? JSON.parse(g) : structuredClone(porDefecto);
  } catch (e) { return structuredClone(porDefecto); }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); return true; }
  catch (e) { aviso("⚠️ No se pudo guardar (almacenamiento lleno o modo privado)."); return false; }
}
/* Escapa texto que viene del usuario antes de meterlo en innerHTML. */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function slug(s) { return String(s).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "cat"; }

/* -------------------- 1) CÁLCULO DE LA TABLA -------------------- */
function calcularTabla(hastaJornada) {
  const map = {};
  EQUIPOS.forEach(b => map[b.equipo] = { ...b });
  for (const j of RESULTADOS) {
    if (j.num > hastaJornada) break;
    for (const p of j.partidos) aplicarPartido(map, p);
  }
  const filas = Object.values(map).map(t => ({ ...t, jj: t.jg + t.je + t.jp, dif: t.gf - t.gc }));
  const orden = CONFIG.desempates;
  filas.sort((a, b) => {
    for (const c of orden) { if (b[c] !== a[c]) return b[c] - a[c]; }
    return a.equipo.localeCompare(b.equipo);
  });
  return filas;
}
function aplicarPartido(map, p) {
  if (p.gl == null || p.gv == null) return;
  const L = map[p.loc], V = map[p.vis], W = CONFIG.puntos;
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
function jugada(num) {
  const j = RESULTADOS.find(x => x.num === num);
  return j && j.partidos.some(p => p.gl != null && p.gv != null);
}

/* -------------------- 2) TABLA (HTML) -------------------- */
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
      <td class="eq">${esc(t.equipo)}</td>
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

/* -------------------- 3) GOLEADORES (editable) -------------------- */
function renderGoleadores() {
  const cont = document.getElementById("gol-body");
  cont.innerHTML = "";
  [...GOLES].sort((a, b) => b.goles - a.goles || a.jugador.localeCompare(b.jugador))
    .slice(0, 10).forEach((g, i) => {
      const idx = GOLES.indexOf(g);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="pos">${i + 1}</td>
        <td class="eq">${esc(g.jugador)}<span class="sub">${esc(g.equipo)}</span></td>
        <td class="tnum pts">${g.goles}</td>
        <td class="acc">
          <button class="mini" data-acc="dec" data-idx="${idx}" aria-label="Quitar un gol">−</button>
          <button class="mini mas" data-acc="inc" data-idx="${idx}" aria-label="Sumar un gol">+1</button>
          <button class="mini del" data-acc="del" data-idx="${idx}" aria-label="Borrar">🗑</button>
        </td>`;
      cont.appendChild(tr);
    });
}

function llenarSelectEquipos() {
  const sel = document.getElementById("g-equipo");
  const actual = sel.value;
  sel.innerHTML = "";
  EQUIPOS.map(b => b.equipo).sort((a, b) => a.localeCompare(b)).forEach(nom => {
    const o = document.createElement("option"); o.value = nom; o.textContent = nom; sel.appendChild(o);
  });
  if (actual) sel.value = actual;
}
function addGoleador() {
  const nombre = document.getElementById("g-nombre").value.trim();
  const equipo = document.getElementById("g-equipo").value;
  const goles = Math.max(1, parseInt(document.getElementById("g-goles").value, 10) || 1);
  if (!nombre) { aviso("Escribe el nombre del jugador."); return; }
  const ya = GOLES.find(g => g.jugador.toLowerCase() === nombre.toLowerCase() && g.equipo === equipo);
  if (ya) ya.goles += goles;
  else GOLES.push({ jugador: nombre, equipo, goles });
  guardar(LS_GOLEADORES, GOLES);
  document.getElementById("g-nombre").value = "";
  document.getElementById("g-goles").value = "1";
  renderGoleadores();
  aviso(`✅ ${ya ? "Sumados" : "Agregado"} · ${nombre}`);
}
function ajustarGol(idx, delta) {
  if (!GOLES[idx]) return;
  GOLES[idx].goles = Math.max(0, GOLES[idx].goles + delta);
  guardar(LS_GOLEADORES, GOLES); renderGoleadores();
}
function borrarGol(idx) {
  if (!GOLES[idx]) return;
  if (!confirm(`¿Borrar a ${GOLES[idx].jugador}?`)) return;
  GOLES.splice(idx, 1); guardar(LS_GOLEADORES, GOLES); renderGoleadores();
}

/* -------------------- 4) ROL / CALENDARIO -------------------- */
function renderRol() {
  const j = RESULTADOS.find(x => x.num === jornadaVista);
  const cont = document.getElementById("rol-body");
  cont.innerHTML = "";
  document.getElementById("rol-titulo").textContent = j ? `Rol · Jornada ${jornadaVista}` : "Rol";
  if (!j) { cont.innerHTML = `<p class="hint">No hay jornadas. Genera un rol en Admin.</p>`; return; }
  j.partidos.forEach(p => {
    const row = document.createElement("div");
    row.className = "rol-row";
    if (p.bye) {
      row.innerHTML = `<div class="rol-line"><span class="rol-loc">${esc(p.loc)}</span><span class="rol-vs">descansa</span><span class="rol-vis"></span></div>`;
      cont.appendChild(row); return;
    }
    const jug = p.gl != null && p.gv != null;
    const centro = jug ? `<span class="rol-sc">${p.gl} - ${p.gv}</span>` : `<span class="rol-vs">vs</span>`;
    const sello = p.def ? `<span class="sello">default</span>` : "";
    const meta = (p.hora || p.campo)
      ? `<div class="rol-meta">${p.hora ? "🕐 " + esc(p.hora) : ""}${p.campo ? " · 📍 " + esc(p.campo) : ""}</div>` : "";
    row.innerHTML = `
      <div class="rol-line">
        <span class="rol-loc">${esc(p.loc)}</span>
        ${centro}
        <span class="rol-vis">${esc(p.vis)} ${sello}</span>
      </div>${meta}`;
    cont.appendChild(row);
  });
}

/* -------------------- 5) CAPTURA -------------------- */
function renderCaptura() {
  const j = RESULTADOS.find(x => x.num === jornadaVista);
  const cont = document.getElementById("captura-body");
  cont.innerHTML = "";
  document.getElementById("captura-titulo").textContent = j ? `Capturar Jornada ${jornadaVista}` : "Capturar";
  if (!j) { cont.innerHTML = `<p class="hint">No hay jornadas. Genera un rol en Admin.</p>`; return; }
  j.partidos.forEach((p, idx) => {
    if (p.bye) return;
    const row = document.createElement("div");
    row.className = "cap-row";
    const sello = p.def ? `<span class="sello">default</span>` : "";
    const detalle = (p.hora || p.campo)
      ? `<span class="detalle">${p.hora ? esc(p.hora) + " · " : ""}${esc(p.campo || "")}</span>` : "";
    row.innerHTML = `
      <span class="cap-eq loc">${esc(p.loc)}</span>
      <input class="cap-in" type="number" min="0" inputmode="numeric"
             data-i="${idx}" data-lado="gl" value="${p.gl ?? ""}" aria-label="Goles ${esc(p.loc)}">
      <span class="cap-vs">-</span>
      <input class="cap-in" type="number" min="0" inputmode="numeric"
             data-i="${idx}" data-lado="gv" value="${p.gv ?? ""}" aria-label="Goles ${esc(p.vis)}">
      <span class="cap-eq vis">${esc(p.vis)} ${sello}${detalle}</span>`;
    cont.appendChild(row);
  });
}

function guardarCaptura() {
  const j = RESULTADOS.find(x => x.num === jornadaVista);
  if (!j) return;
  document.querySelectorAll("#captura-body .cap-in").forEach(inp => {
    const i = +inp.dataset.i, lado = inp.dataset.lado, v = inp.value.trim();
    j.partidos[i][lado] = v === "" ? null : Math.max(0, parseInt(v, 10) || 0);
  });
  guardar(LS_RESULTADOS, RESULTADOS);
  renderTodo();
  const incompletos = j.partidos.filter(p => !p.bye && (p.gl == null) !== (p.gv == null)).length;
  aviso(incompletos
    ? `✅ Guardada. Ojo: ${incompletos} partido(s) con un solo marcador aún no cuentan.`
    : "✅ Jornada guardada. La tabla ya se actualizó.");
}

/* -------------------- 6) IMÁGENES (Canvas) -------------------- */
const IMG_W = 1080, PAD = 56;

function fondo(c, W, H, subtitulo) {
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0C1E15"); bg.addColorStop(1, "#0E241A");
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  c.strokeStyle = "rgba(255,255,255,.05)"; c.lineWidth = 2;
  for (let x = 78; x < W; x += 90) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  c.textBaseline = "alphabetic"; c.textAlign = "left";
  c.fillStyle = "#7FD3A6"; c.font = "700 26px system-ui, Arial";
  c.fillText(CONFIG.lema.toUpperCase(), PAD, 70);
  c.fillStyle = "#FBFDFB"; c.font = "800 52px system-ui, Arial";
  c.fillText(`Categoría ${catActiva}`, PAD, 130);
  c.fillStyle = "#C9D8CE"; c.font = "600 30px system-ui, Arial";
  c.fillText(subtitulo, PAD, 176);
}
function footer(c, W, H) {
  const yF = H - 150;
  c.fillStyle = "#B9770F"; c.fillRect(0, yF, W, 150);
  c.textAlign = "left";
  c.fillStyle = "#3A2606"; c.font = "700 22px system-ui, Arial";
  c.fillText("PATROCINA", PAD, yF + 42);
  c.fillStyle = "#FFF7E8"; c.font = "800 44px system-ui, Arial";
  c.fillText(PATRON.nombre, PAD, yF + 90);
  c.fillStyle = "#3A2606"; c.font = "600 26px system-ui, Arial";
  c.fillText(PATRON.lema, PAD, yF + 126);
  if (PATRON.tel) {
    c.textAlign = "right"; c.fillStyle = "#FFF7E8"; c.font = "700 32px ui-monospace, monospace";
    c.fillText(`WhatsApp ${PATRON.tel}`, W - PAD, yF + 90);
  }
}

function generarImagenTabla() {
  const filas = calcularTabla(jornadaVista);
  const rowH = 60, headH = 250, W = IMG_W;
  const H = headH + rowH * filas.length + 150 + 24;
  const cv = document.getElementById("lienzo"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const base = jugada(jornadaVista) ? `Tabla tras la Jornada ${jornadaVista}` : `Jornada ${jornadaVista}`;
  fondo(c, W, H, `${base}  ·  Primeros ${CONFIG.clasifican} clasifican`);

  const yCols = headH - 22;
  c.fillStyle = "#8FB6A0"; c.font = "700 24px system-ui, Arial";
  c.textAlign = "left"; c.fillText("#", PAD, yCols); c.fillText("EQUIPO", PAD + 56, yCols);
  c.textAlign = "right"; c.fillText("JJ", W - 300, yCols); c.fillText("DIF", W - 170, yCols); c.fillText("PTS", W - PAD, yCols);

  filas.forEach((t, i) => {
    const pos = i + 1, y = headH + i * rowH, cla = pos <= CONFIG.clasifican;
    if (cla) { c.fillStyle = "rgba(18,144,90,.14)"; c.fillRect(0, y, W, rowH); }
    if (pos === CONFIG.clasifican) {
      c.strokeStyle = "#12905A"; c.lineWidth = 4;
      c.beginPath(); c.moveTo(0, y + rowH); c.lineTo(W, y + rowH); c.stroke();
    }
    const midY = y + rowH / 2 + 10;
    c.textAlign = "left";
    c.fillStyle = cla ? "#7FD3A6" : "#6E7A70"; c.font = "700 30px system-ui, Arial";
    c.fillText(String(pos), PAD, midY);
    c.fillStyle = "#EFF3EE"; c.font = "600 32px system-ui, Arial";
    c.fillText(t.equipo, PAD + 56, midY);
    c.textAlign = "right";
    c.fillStyle = "#B9CFC2"; c.font = "500 30px ui-monospace, monospace";
    c.fillText(String(t.jj), W - 300, midY);
    c.fillText((t.dif > 0 ? "+" : "") + t.dif, W - 170, midY);
    c.fillStyle = cla ? "#FBFDFB" : "#C9D8CE"; c.font = "800 34px ui-monospace, monospace";
    c.fillText(String(t.pts), W - PAD, midY);
  });

  footer(c, W, H);
  mostrarImagen(cv, `tabla-${slug(catActiva)}-j${jornadaVista}`);
}

function generarImagenResultados() {
  const j = RESULTADOS.find(x => x.num === jornadaVista);
  if (!j) { aviso("No hay jornadas."); return; }
  const ps = j.partidos.filter(p => !p.bye);
  const rowH = 92, headH = 240, W = IMG_W;
  const H = headH + rowH * Math.max(ps.length, 1) + 150 + 20;
  const cv = document.getElementById("lienzo"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  fondo(c, W, H, `Resultados · Jornada ${jornadaVista}`);

  ps.forEach((p, i) => {
    const y = headH + i * rowH, midY = y + rowH / 2, jug = p.gl != null && p.gv != null;
    if (i % 2 === 0) { c.fillStyle = "rgba(255,255,255,.03)"; c.fillRect(0, y, W, rowH); }
    // local (derecha del nombre hacia el centro)
    c.textAlign = "right"; c.fillStyle = "#EFF3EE"; c.font = "600 30px system-ui, Arial";
    c.fillText(recorta(p.loc), W / 2 - 90, midY + 4);
    // visitante
    c.textAlign = "left";
    c.fillText(recorta(p.vis), W / 2 + 90, midY + 4);
    // marcador o vs
    c.textAlign = "center";
    if (jug) {
      c.fillStyle = "#12905A"; c.beginPath();
      roundRect(c, W / 2 - 78, midY - 26, 156, 52, 12); c.fill();
      c.fillStyle = "#FBFDFB"; c.font = "800 34px ui-monospace, monospace";
      c.fillText(`${p.gl} - ${p.gv}`, W / 2, midY + 8);
    } else {
      c.fillStyle = "#6E7A70"; c.font = "700 26px system-ui, Arial";
      c.fillText("vs", W / 2, midY + 6);
      if (p.hora) { c.fillStyle = "#8FB6A0"; c.font = "500 20px system-ui, Arial"; c.fillText(p.hora, W / 2, midY + 30); }
    }
    if (p.def) { c.textAlign = "center"; c.fillStyle = "#D2901E"; c.font = "600 18px system-ui, Arial"; c.fillText("default", W / 2, midY + 34); }
  });

  footer(c, W, H);
  mostrarImagen(cv, `resultados-${slug(catActiva)}-j${jornadaVista}`);
}

function generarImagenGoleadores() {
  const lista = [...GOLES].sort((a, b) => b.goles - a.goles || a.jugador.localeCompare(b.jugador)).slice(0, 10);
  const rowH = 74, headH = 240, W = IMG_W;
  const H = headH + rowH * Math.max(lista.length, 1) + 150 + 20;
  const cv = document.getElementById("lienzo"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  fondo(c, W, H, "Tabla de goleadores");
  lista.forEach((g, i) => {
    const y = headH + i * rowH, midY = y + rowH / 2 + 8;
    if (i === 0) { c.fillStyle = "rgba(210,144,30,.16)"; c.fillRect(0, y, W, rowH); }
    c.textAlign = "left";
    c.fillStyle = i === 0 ? "#D2901E" : "#6E7A70"; c.font = "700 30px system-ui, Arial";
    c.fillText(String(i + 1), PAD, midY);
    c.fillStyle = "#EFF3EE"; c.font = "600 34px system-ui, Arial";
    c.fillText(recorta(g.jugador, 22), PAD + 60, midY - 6);
    c.fillStyle = "#8FB6A0"; c.font = "500 22px system-ui, Arial";
    c.fillText(g.equipo, PAD + 60, midY + 22);
    c.textAlign = "right"; c.fillStyle = "#FBFDFB"; c.font = "800 40px ui-monospace, monospace";
    c.fillText(String(g.goles), W - PAD, midY);
  });
  footer(c, W, H);
  mostrarImagen(cv, `goleadores-${slug(catActiva)}`);
}

function generarImagenRol() {
  const j = RESULTADOS.find(x => x.num === jornadaVista);
  if (!j) { aviso("No hay jornadas."); return; }
  const ps = j.partidos.filter(p => !p.bye);
  const rowH = 104, headH = 240, W = IMG_W;
  const H = headH + rowH * Math.max(ps.length, 1) + 150 + 20;
  const cv = document.getElementById("lienzo"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  fondo(c, W, H, `Rol · Jornada ${jornadaVista}`);
  ps.forEach((p, i) => {
    const y = headH + i * rowH, midY = y + rowH / 2 - 4, jug = p.gl != null && p.gv != null;
    if (i % 2 === 0) { c.fillStyle = "rgba(255,255,255,.03)"; c.fillRect(0, y, W, rowH); }
    c.textAlign = "right"; c.fillStyle = "#EFF3EE"; c.font = "600 30px system-ui, Arial";
    c.fillText(recorta(p.loc), W / 2 - 80, midY);
    c.textAlign = "left"; c.fillText(recorta(p.vis), W / 2 + 80, midY);
    c.textAlign = "center";
    if (jug) {
      c.fillStyle = "#12905A"; c.beginPath(); roundRect(c, W / 2 - 70, midY - 26, 140, 48, 11); c.fill();
      c.fillStyle = "#FBFDFB"; c.font = "800 30px ui-monospace, monospace"; c.fillText(`${p.gl}-${p.gv}`, W / 2, midY - 2);
    } else {
      c.fillStyle = "#6E7A70"; c.font = "700 24px system-ui, Arial"; c.fillText("vs", W / 2, midY - 2);
    }
    const meta = [p.hora ? "🕐 " + p.hora : "", p.campo ? "📍 " + p.campo : "", p.def ? "default" : ""]
      .filter(Boolean).join("   ");
    if (meta) { c.textAlign = "center"; c.fillStyle = "#8FB6A0"; c.font = "500 22px system-ui, Arial"; c.fillText(meta, W / 2, midY + 30); }
  });
  footer(c, W, H);
  mostrarImagen(cv, `rol-${slug(catActiva)}-j${jornadaVista}`);
}

function recorta(s, max = 18) { return s.length > max ? s.slice(0, max - 1) + "…" : s; }
function roundRect(c, x, y, w, h, r) {
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
}

function mostrarImagen(cv, nombre) {
  const url = cv.toDataURL("image/png");
  const img = document.getElementById("preview");
  img.src = url; img.style.display = "block";
  document.getElementById("preview-hint").style.display = "none";
  const dl = document.getElementById("btn-descargar");
  dl.href = url; dl.download = `${nombre}.png`;
  document.getElementById("acciones-img").style.display = "flex";
  cv._nombre = nombre;
}

async function compartirImagen() {
  const cv = document.getElementById("lienzo");
  try {
    const blob = await new Promise(res => cv.toBlob(res, "image/png"));
    const file = new File([blob], `${cv._nombre || "liga"}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Liga ${catActiva}`,
        text: `${CONFIG.lema} · Categoría ${catActiva}` });
    } else {
      aviso("Tu navegador no comparte directo. Usa “Descargar” y envíala por WhatsApp.");
    }
  } catch (e) { /* cancelado */ }
}

/* -------------------- 7) PATROCINADOR -------------------- */
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

/* -------------------- 8) ADMIN: equipos y rol -------------------- */
function renderEquipos() {
  const cont = document.getElementById("equipos-body");
  cont.innerHTML = "";
  const tabla = calcularTabla(ultimaJornadaNum());
  const ptsDe = {}; tabla.forEach(t => ptsDe[t.equipo] = t.pts);
  EQUIPOS.forEach((t, idx) => {
    const row = document.createElement("div");
    row.className = "eq-row";
    row.innerHTML = `
      <span class="eq-nom">${esc(t.equipo)}</span>
      <span class="eq-rec tnum">${ptsDe[t.equipo] ?? t.pts} pts</span>
      <button class="mini del" data-eqdel="${idx}" aria-label="Borrar ${esc(t.equipo)}">🗑</button>`;
    cont.appendChild(row);
  });
  document.getElementById("eq-count").textContent = `${EQUIPOS.length} equipos`;
}
function addEquipo() {
  const inp = document.getElementById("eq-nombre");
  const nom = inp.value.trim();
  if (!nom) { aviso("Escribe el nombre del equipo."); return; }
  if (EQUIPOS.some(e => e.equipo.toLowerCase() === nom.toLowerCase())) { aviso("Ese equipo ya existe."); return; }
  EQUIPOS.push({ equipo: nom, jg: 0, je: 0, jp: 0, gf: 0, gc: 0, pts: 0, jugadores: [] });
  guardar(LS_EQUIPOS, EQUIPOS);
  inp.value = "";
  llenarSelectEquipos(); renderTodo();
  aviso(`✅ Equipo agregado: ${nom}`);
}
function delEquipo(idx) {
  const eq = EQUIPOS[idx];
  if (!eq) return;
  const tienePartidos = RESULTADOS.some(j => j.partidos.some(p => p.loc === eq.equipo || p.vis === eq.equipo));
  const msg = tienePartidos
    ? `${eq.equipo} tiene partidos en el rol. Si lo borras, esos partidos quedarán con un equipo inexistente. ¿Borrar de todas formas?`
    : `¿Borrar al equipo ${eq.equipo}?`;
  if (!confirm(msg)) return;
  EQUIPOS.splice(idx, 1); guardar(LS_EQUIPOS, EQUIPOS);
  llenarSelectEquipos(); renderTodo();
}
/* Round-robin (método del círculo): todos contra todos, alternando local/visitante. */
function roundRobin(nombres) {
  const t = nombres.slice();
  if (t.length % 2) t.push("— descansa —");
  const n = t.length, rondas = n - 1, mitad = n / 2;
  let arr = t.slice();
  const jornadas = [];
  for (let r = 0; r < rondas; r++) {
    const partidos = [];
    for (let i = 0; i < mitad; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      const aBye = a.startsWith("— descansa"), bBye = b.startsWith("— descansa");
      if (aBye || bBye) { partidos.push({ loc: aBye ? b : a, vis: "descansa", gl: null, gv: null, bye: true }); continue; }
      const [loc, vis] = r % 2 ? [b, a] : [a, b];
      partidos.push({ loc, gl: null, gv: null, vis });
    }
    jornadas.push({ num: r + 1, fecha: "", partidos });
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return jornadas;
}
function generarRolNuevo() {
  const nombres = EQUIPOS.map(e => e.equipo);
  if (nombres.length < 2) { aviso("Agrega al menos 2 equipos."); return; }
  if (!confirm(`Se creará un rol de todos contra todos con ${nombres.length} equipos y se reiniciará la temporada en 0. ¿Continuar?`)) return;
  RESULTADOS = roundRobin(nombres);
  EQUIPOS.forEach(e => { e.jg = e.je = e.jp = e.gf = e.gc = e.pts = 0; });
  guardar(LS_RESULTADOS, RESULTADOS); guardar(LS_EQUIPOS, EQUIPOS);
  jornadaVista = RESULTADOS[0] ? RESULTADOS[0].num : 1;
  rebuildSelector(); renderTodo();
  document.getElementById("rol-completo").hidden = true;
  aviso(`✅ Rol generado: ${RESULTADOS.length} jornadas.`);
}
function rolATexto() {
  let out = `${CONFIG.liga}\n${CONFIG.lema} · Categoría ${CONFIG.categoria}\nROL DE JUEGOS\n`;
  RESULTADOS.forEach(j => {
    out += `\n== Jornada ${j.num}${j.fecha ? " (" + j.fecha + ")" : ""} ==\n`;
    j.partidos.forEach(p => {
      const marc = (p.gl != null && p.gv != null) ? `${p.gl}-${p.gv}` : "vs";
      const meta = [p.hora, p.campo, p.def ? "default" : ""].filter(Boolean).join(" · ");
      out += `${p.loc} ${marc} ${p.vis}${meta ? "  [" + meta + "]" : ""}\n`;
    });
  });
  return out;
}
function descargarRol() {
  const a = document.createElement("a");
  a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(rolATexto());
  a.download = `rol-${slug(catActiva)}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  aviso("⬇️ Rol descargado.");
}
function verRolCompleto() {
  const box = document.getElementById("rol-completo");
  if (!box.hidden) { box.hidden = true; return; }
  box.innerHTML = "";
  RESULTADOS.forEach(j => {
    const blk = document.createElement("div"); blk.className = "rc-jor";
    blk.innerHTML = `<div class="rc-h">Jornada ${j.num}</div>` + j.partidos.map(p => {
      if (p.bye) return `<div class="rc-p">${esc(p.loc)} — descansa</div>`;
      const m = (p.gl != null && p.gv != null) ? `${p.gl}-${p.gv}` : "vs";
      const meta = [p.hora, p.campo].filter(Boolean).map(esc).join(" · ");
      return `<div class="rc-p">${esc(p.loc)} <b>${m}</b> ${esc(p.vis)}${meta ? ` · ${meta}` : ""}</div>`;
    }).join("");
    box.appendChild(blk);
  });
  box.hidden = false;
}

/* -------------------- 8b) RESPALDO (exportar / importar) -------------------- */
function respaldoData() {
  guardarCategoriaActual();
  const datos = {};
  CATS.forEach(c => {
    datos[c] = {
      equipos: cargar(`liga_cat_${c}_equipos`, seedEq(c)),
      resultados: cargar(`liga_cat_${c}_resultados`, seedRes(c)),
      goleadores: cargar(`liga_cat_${c}_goleadores`, seedGol(c))
    };
  });
  return { app: "liga", version: 2, categorias: CATS.slice(), activa: catActiva, patrocinador: PATRON, datos };
}
function exportarRespaldo() {
  const a = document.createElement("a");
  a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(respaldoData(), null, 2));
  a.download = `respaldo-${slug(catActiva)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  aviso("⬇️ Respaldo descargado.");
}
function aplicarRespaldo(d) {
  if (!d) { aviso("⚠️ Archivo de respaldo no válido."); return false; }
  // Formato completo v2: todas las categorías
  if (d.datos && Array.isArray(d.categorias) && d.categorias.length) {
    if (!confirm("Esto reemplazará TODAS las categorías y sus datos con los del respaldo. ¿Continuar?")) return false;
    Object.keys(localStorage).filter(k => k.startsWith("liga_cat_")).forEach(k => localStorage.removeItem(k));
    CATS = d.categorias.slice();
    CATS.forEach(c => {
      const dd = d.datos[c] || {};
      localStorage.setItem(`liga_cat_${c}_equipos`, JSON.stringify(dd.equipos || []));
      localStorage.setItem(`liga_cat_${c}_resultados`, JSON.stringify(dd.resultados || []));
      localStorage.setItem(`liga_cat_${c}_goleadores`, JSON.stringify(dd.goleadores || []));
    });
    guardar(K_CATS, CATS);
    catActiva = CATS.includes(d.activa) ? d.activa : CATS[0];
    setCatKeys(catActiva); guardar(K_ACTIVA, catActiva);
    if (d.patrocinador && d.patrocinador.nombre) { PATRON = d.patrocinador; guardar(LS_PATRON, PATRON); }
    EQUIPOS = cargar(LS_EQUIPOS, []); normalizeEquipos();
    RESULTADOS = cargar(LS_RESULTADOS, []); GOLES = cargar(LS_GOLEADORES, []);
    jornadaVista = jornadaPorDefecto();
    document.title = `${catActiva} · ${CONFIG.lema}`;
    rebuildCatSelect(); rebuildSelector(); cargarPatronUI(); llenarSelectEquipos(); renderTodo();
    aviso("✅ Respaldo completo importado.");
    return true;
  }
  // Formato de una categoría (compatibilidad): se enruta a su categoría
  if (Array.isArray(d.equipos) && Array.isArray(d.resultados)) {
    const cat = (d.categoria && String(d.categoria)) || catActiva;
    if (!confirm(`Se reemplazarán los datos de la categoría "${cat}". ¿Continuar?`)) return false;
    if (!CATS.includes(cat)) { CATS.push(cat); guardar(K_CATS, CATS); }
    catActiva = cat; setCatKeys(cat); guardar(K_ACTIVA, catActiva);
    EQUIPOS = d.equipos; normalizeEquipos();
    RESULTADOS = d.resultados;
    GOLES = Array.isArray(d.goleadores) ? d.goleadores : [];
    if (d.patrocinador && d.patrocinador.nombre) PATRON = d.patrocinador;
    guardarCategoriaActual(); guardar(LS_PATRON, PATRON);
    jornadaVista = jornadaPorDefecto();
    document.title = `${catActiva} · ${CONFIG.lema}`;
    rebuildCatSelect(); rebuildSelector(); cargarPatronUI(); llenarSelectEquipos(); renderTodo();
    aviso(`✅ Respaldo importado en ${cat}.`);
    return true;
  }
  aviso("⚠️ Archivo de respaldo no válido.");
  return false;
}
function importarRespaldo(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { aplicarRespaldo(JSON.parse(reader.result)); }
    catch (e) { aviso("⚠️ No se pudo leer el archivo."); }
  };
  reader.onerror = () => aviso("⚠️ No se pudo leer el archivo.");
  reader.readAsText(file);
}

/* -------------------- 8c) CATEGORÍAS -------------------- */
function guardarCategoriaActual() {
  guardar(LS_EQUIPOS, EQUIPOS); guardar(LS_RESULTADOS, RESULTADOS); guardar(LS_GOLEADORES, GOLES);
}
function cambiarCategoria(cat) {
  if (!CATS.includes(cat)) return;
  guardarCategoriaActual();
  catActiva = cat; setCatKeys(cat); guardar(K_ACTIVA, catActiva);
  document.title = `${catActiva} · ${CONFIG.lema}`;
  EQUIPOS = cargar(LS_EQUIPOS, seedEq(cat)); normalizeEquipos();
  RESULTADOS = cargar(LS_RESULTADOS, seedRes(cat));
  GOLES = cargar(LS_GOLEADORES, seedGol(cat));
  jornadaVista = jornadaPorDefecto();
  rebuildCatSelect(); rebuildSelector(); llenarSelectEquipos(); renderTodo();
}
function addCategoria(nombre) {
  nombre = (nombre || "").trim();
  if (!nombre) { aviso("Escribe el nombre de la categoría."); return; }
  if (CATS.some(c => c.toLowerCase() === nombre.toLowerCase())) { aviso("Esa categoría ya existe."); return; }
  guardarCategoriaActual();
  CATS.push(nombre); guardar(K_CATS, CATS);
  document.getElementById("cat-nombre").value = "";
  cambiarCategoria(nombre);
  aviso(`✅ Categoría creada: ${nombre}`);
}
function delCategoria(cat) {
  if (CATS.length <= 1) { aviso("Debe quedar al menos una categoría."); return; }
  if (!confirm(`¿Borrar la categoría ${cat} y TODOS sus datos (equipos, jugadores, rol)?`)) return;
  ["equipos", "resultados", "goleadores"].forEach(s => localStorage.removeItem(`liga_cat_${cat}_${s}`));
  CATS = CATS.filter(c => c !== cat); guardar(K_CATS, CATS);
  if (catActiva === cat) {
    catActiva = CATS[0]; setCatKeys(catActiva); guardar(K_ACTIVA, catActiva);
    EQUIPOS = cargar(LS_EQUIPOS, seedEq(catActiva)); normalizeEquipos();
    RESULTADOS = cargar(LS_RESULTADOS, seedRes(catActiva));
    GOLES = cargar(LS_GOLEADORES, seedGol(catActiva));
    jornadaVista = jornadaPorDefecto();
  }
  rebuildCatSelect(); rebuildSelector(); llenarSelectEquipos(); renderTodo();
  aviso(`Categoría ${cat} borrada.`);
}
function rebuildCatSelect() {
  const sel = document.getElementById("sel-categoria");
  if (!sel) return;
  sel.innerHTML = "";
  CATS.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o); });
  sel.value = catActiva;
}
function renderCategorias() {
  const cont = document.getElementById("categorias-body");
  if (!cont) return;
  cont.innerHTML = "";
  CATS.forEach((c, i) => {
    const row = document.createElement("div"); row.className = "eq-row";
    row.innerHTML = `
      <span class="eq-nom">${esc(c)}</span>
      ${c === catActiva ? '<span class="cat-activa">activa</span>' : ''}
      <button class="mini" data-act="ver" data-catidx="${i}">Ver</button>
      <button class="mini del" data-act="del" data-catidx="${i}" aria-label="Borrar ${esc(c)}">🗑</button>`;
    cont.appendChild(row);
  });
  const cnt = document.getElementById("cat-count");
  if (cnt) cnt.textContent = `${CATS.length} categoría(s)`;
}

/* -------------------- 9) PLANTILLAS (jugadores por equipo) -------------------- */
function normalizeEquipos() {
  EQUIPOS.forEach(e => { if (!Array.isArray(e.jugadores)) e.jugadores = []; });
}
function equipoSelPl() { return document.getElementById("sel-equipo-pl").value; }
function renderPlantillaSelect() {
  const sel = document.getElementById("sel-equipo-pl");
  const actual = sel.value;
  sel.innerHTML = "";
  EQUIPOS.map(e => e.equipo).forEach(n => {
    const o = document.createElement("option"); o.value = n; o.textContent = n; sel.appendChild(o);
  });
  if (actual && EQUIPOS.some(e => e.equipo === actual)) sel.value = actual;
}
function renderPlantilla() {
  const eq = EQUIPOS.find(e => e.equipo === equipoSelPl());
  const cont = document.getElementById("plantilla-body");
  cont.innerHTML = "";
  const cnt = document.getElementById("pl-count");
  if (!eq) { cnt.textContent = ""; return; }
  const js = [...eq.jugadores].sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999));
  cnt.textContent = `${eq.jugadores.length} jugadores`;
  if (!js.length) { cont.innerHTML = `<p class="hint">Sin jugadores todavía. Agrega el primero abajo.</p>`; return; }
  js.forEach(j => {
    const idx = eq.jugadores.indexOf(j);
    const row = document.createElement("div"); row.className = "pl-row";
    row.innerHTML = `
      <span class="pl-num tnum">${j.numero ?? "–"}</span>
      <span class="pl-nom">${esc(j.nombre)}</span>
      <button class="mini del" data-jugdel="${idx}" aria-label="Borrar ${esc(j.nombre)}">🗑</button>`;
    cont.appendChild(row);
  });
}
function addJugador() {
  const nom = document.getElementById("pl-nombre").value.trim();
  const numRaw = document.getElementById("pl-num").value.trim();
  const numero = numRaw === "" ? null : Math.max(0, parseInt(numRaw, 10) || 0);
  if (!nom) { aviso("Escribe el nombre del jugador."); return; }
  const eq = EQUIPOS.find(e => e.equipo === equipoSelPl());
  if (!eq) { aviso("Elige un equipo."); return; }
  eq.jugadores.push({ nombre: nom, numero });
  guardar(LS_EQUIPOS, EQUIPOS);
  document.getElementById("pl-nombre").value = "";
  document.getElementById("pl-num").value = "";
  renderPlantilla(); renderMiEquipo();
  aviso(`✅ ${nom} agregado a ${eq.equipo}`);
}
function delJugador(idx) {
  const eq = EQUIPOS.find(e => e.equipo === equipoSelPl());
  if (!eq || !eq.jugadores[idx]) return;
  eq.jugadores.splice(idx, 1); guardar(LS_EQUIPOS, EQUIPOS); renderPlantilla(); renderMiEquipo();
}
function generarImagenPlantilla() {
  const eq = EQUIPOS.find(e => e.equipo === equipoSelPl());
  if (!eq) return;
  const js = [...eq.jugadores].sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999));
  const rowH = 58, headH = 240, W = IMG_W;
  const H = headH + rowH * Math.max(js.length, 1) + 150 + 20;
  const cv = document.getElementById("lienzo"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  fondo(c, W, H, `Plantilla · ${eq.equipo}`);
  if (!js.length) {
    c.fillStyle = "#8FB6A0"; c.font = "500 30px system-ui, Arial"; c.textAlign = "left";
    c.fillText("Sin jugadores registrados", PAD, headH + 40);
  }
  js.forEach((j, i) => {
    const y = headH + i * rowH, midY = y + rowH / 2 + 10;
    if (i % 2 === 0) { c.fillStyle = "rgba(255,255,255,.03)"; c.fillRect(0, y, W, rowH); }
    c.textAlign = "right"; c.fillStyle = "#7FD3A6"; c.font = "700 30px ui-monospace, monospace";
    c.fillText(j.numero != null ? String(j.numero) : "–", PAD + 60, midY);
    c.textAlign = "left"; c.fillStyle = "#EFF3EE"; c.font = "600 32px system-ui, Arial";
    c.fillText(recorta(j.nombre, 30), PAD + 90, midY);
  });
  footer(c, W, H);
  mostrarImagen(cv, `plantilla-${eq.equipo.toLowerCase().replace(/\s+/g, "-")}`);
}

/* -------------------- 10) MI EQUIPO (vista de jugador) -------------------- */
function ultimaJornadaNum() { return RESULTADOS.length ? RESULTADOS[RESULTADOS.length - 1].num : 0; }
function partidosDeEquipo(nombre) {
  const out = [];
  RESULTADOS.forEach(j => j.partidos.forEach(p => {
    if (p.bye) return;
    if (p.loc === nombre) out.push({ jor: j.num, rival: p.vis, local: true, gf: p.gl, ga: p.gv, hora: p.hora, campo: p.campo });
    else if (p.vis === nombre) out.push({ jor: j.num, rival: p.loc, local: false, gf: p.gv, ga: p.gl, hora: p.hora, campo: p.campo });
  }));
  return out;
}
function partidosRestantes(nombre) {
  return partidosDeEquipo(nombre).filter(p => p.gf == null || p.ga == null).length;
}
/* Escenario de clasificación (condiciones matemáticas SUFICIENTES, sin simular todo). */
function escenarioClasificacion(nombre) {
  const tabla = calcularTabla(ultimaJornadaNum());
  const pos = tabla.findIndex(t => t.equipo === nombre) + 1;
  const T = tabla[pos - 1];
  if (!T) return null;
  const K = CONFIG.clasifican;
  const rem = {}; tabla.forEach(t => rem[t.equipo] = partidosRestantes(t.equipo));
  const maxPts = t => t.pts + 2 * (rem[t.equipo] || 0);
  const remT = rem[nombre] || 0, maxT = T.pts + 2 * remT;
  const eliminado = tabla.filter(t => t.equipo !== nombre && t.pts > maxT).length >= K;
  const asegurado = tabla.filter(t => t.equipo !== nombre && maxPts(t) >= T.pts).length < K;
  let gapMsg;
  if (pos <= K) {
    const abajo = tabla[K];
    gapMsg = abajo ? `El ${K + 1}º (${esc(abajo.equipo)}) está a ${T.pts - abajo.pts} pt(s).`
                   : "Nadie por debajo puede alcanzarte.";
  } else {
    const corte = tabla[K - 1];
    gapMsg = `A ${Math.max(0, corte.pts - T.pts)} pt(s) del ${K}º (${esc(corte.equipo)}).`;
  }
  return { remT, maxT, eliminado, asegurado, gapMsg, enZona: pos <= K };
}
function renderMiEquipoSelect() {
  const sel = document.getElementById("sel-equipo-mi");
  const actual = sel.value;
  sel.innerHTML = "";
  EQUIPOS.map(e => e.equipo).forEach(n => {
    const o = document.createElement("option"); o.value = n; o.textContent = n; sel.appendChild(o);
  });
  if (actual && EQUIPOS.some(e => e.equipo === actual)) sel.value = actual;
}
function renderMiEquipo() {
  const nombre = document.getElementById("sel-equipo-mi").value;
  const cont = document.getElementById("miequipo-body");
  const eq = EQUIPOS.find(e => e.equipo === nombre);
  if (!eq) { cont.innerHTML = ""; return; }
  const tabla = calcularTabla(ultimaJornadaNum());
  const pos = tabla.findIndex(t => t.equipo === nombre) + 1;
  const fila = tabla[pos - 1] || { pts: 0, jg: 0, je: 0, jp: 0, dif: 0 };
  const zona = pos > 0 && pos <= CONFIG.clasifican;
  const partidos = partidosDeEquipo(nombre);
  const prox = partidos.find(p => p.gf == null || p.ga == null);
  const jugados = partidos.filter(p => p.gf != null && p.ga != null);
  const forma = jugados.slice(-5).map(p => {
    const r = p.gf > p.ga ? "G" : p.gf === p.ga ? "E" : "P";
    return `<span class="f-badge f-${r}" title="J${p.jor}: ${p.gf}-${p.ga} vs ${p.rival}">${r}</span>`;
  }).join("");
  const proxHtml = prox ? `
      <div class="mi-vs"><span>${esc(nombre)}</span><b>vs</b><span>${esc(prox.rival)}</span></div>
      <div class="mi-meta">
        <span>Jornada ${prox.jor}</span>
        <span>${prox.local ? "🏠 Local" : "✈️ Visitante"}</span>
        ${prox.hora ? `<span>🕐 ${prox.hora}</span>` : ""}
        ${prox.campo ? `<span>📍 ${prox.campo}</span>` : ""}
      </div>` : `<p class="hint">No hay próximos partidos (temporada terminada).</p>`;
  const js = [...eq.jugadores].sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999));
  const plHtml = js.length
    ? js.map(j => `<div class="mi-jug"><span class="pl-num tnum">${j.numero ?? "–"}</span>${esc(j.nombre)}</div>`).join("")
    : `<p class="hint">Sin jugadores. Agrégalos en la pestaña Plantillas.</p>`;
  const E = escenarioClasificacion(nombre);
  let escHtml = "";
  if (E) {
    let verdicto, clase;
    if (E.eliminado) { verdicto = "Sin posibilidades matemáticas"; clase = "malo"; }
    else if (E.asegurado) { verdicto = "¡Clasificación asegurada!"; clase = "bueno"; }
    else if (E.enZona) { verdicto = "En zona de clasificación"; clase = "bueno"; }
    else { verdicto = "Peleando la clasificación"; clase = "neutro"; }
    let proy = "";
    if (prox) {
      const proj = tabla.map(r => ({ ...r }));
      const meP = proj.find(r => r.equipo === nombre);
      if (meP) { meP.pts += 2; meP.dif += 1; meP.gf += 1; }
      proj.sort((a, b) => { for (const c of CONFIG.desempates) { if (b[c] !== a[c]) return b[c] - a[c]; } return a.equipo.localeCompare(b.equipo); });
      const np = proj.findIndex(r => r.equipo === nombre) + 1;
      proy = `<div class="esc-proy">Si ganas tu próximo (y lo demás sigue igual): <b>puesto ${np}º</b></div>`;
    }
    escHtml = `
      <div class="mi-card esc-${clase}">
        <h3>¿Qué necesita ${esc(nombre)}?</h3>
        <div class="esc-verdicto">${verdicto}</div>
        <div class="esc-datos">${E.remT} partido(s) por jugar · ${2 * E.remT} pts en juego</div>
        <div class="esc-gap">${E.gapMsg}</div>
        ${proy}
      </div>`;
  }
  cont.innerHTML = `
    <div class="mi-hero ${zona ? "clasif" : ""}">
      <div class="mi-pos">${pos || "–"}<small>°</small></div>
      <div class="mi-hero-info">
        <div class="mi-eq">${esc(nombre)}</div>
        <div class="mi-rec">${fila.pts} pts · ${fila.jg}G ${fila.je}E ${fila.jp}P · dif ${fila.dif > 0 ? "+" : ""}${fila.dif}</div>
        <div class="mi-tag">${zona ? "✓ En zona de clasificación" : "Fuera de clasificación"}</div>
      </div>
    </div>
    ${escHtml}
    <div class="mi-card"><h3>Próximo partido</h3>${proxHtml}</div>
    <div class="mi-card"><h3>Últimos resultados</h3><div class="forma">${forma || '<span class="hint">Aún sin partidos jugados.</span>'}</div></div>
    <div class="mi-card"><h3>Plantilla (${eq.jugadores.length})</h3><div class="mi-plantilla">${plHtml}</div></div>`;
}

/* -------------------- Pestañas, utilidades y arranque -------------------- */
function initTabs() {
  const tabs = [...document.querySelectorAll(".tab")];
  function activar(t) {
    tabs.forEach(x => { x.classList.remove("active"); x.setAttribute("aria-selected", "false"); x.tabIndex = -1; });
    t.classList.add("active"); t.setAttribute("aria-selected", "true"); t.tabIndex = 0;
    document.querySelectorAll(".tabpanel").forEach(p => p.hidden = true);
    document.getElementById("panel-" + t.dataset.tab).hidden = false;
  }
  tabs.forEach((t, i) => {
    if (!t.id) t.id = "tab-" + t.dataset.tab;
    t.setAttribute("aria-controls", "panel-" + t.dataset.tab);
    const panel = document.getElementById("panel-" + t.dataset.tab);
    if (panel) panel.setAttribute("aria-labelledby", t.id);
    t.addEventListener("click", () => activar(t));
    t.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      activar(next); next.focus();
    });
  });
}

function aviso(msg) {
  const el = document.getElementById("aviso");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 3500);
}

function resetTodo() {
  if (!confirm("¿Borrar TODO (todas las categorías) y volver a los datos originales?")) return;
  Object.keys(localStorage).filter(k => k.startsWith("liga_")).forEach(k => localStorage.removeItem(k));
  CATS = [CONFIG.categoria]; catActiva = CONFIG.categoria; setCatKeys(catActiva);
  EQUIPOS = structuredClone(BASE); normalizeEquipos();
  RESULTADOS = structuredClone(JORNADAS);
  GOLES = structuredClone(GOLEADORES);
  PATRON = structuredClone(CONFIG.patrocinador);
  jornadaVista = jornadaPorDefecto();
  rebuildCatSelect(); rebuildSelector(); cargarPatronUI(); llenarSelectEquipos(); renderTodo();
  aviso("↺ Datos restaurados.");
}

function renderTodo() {
  renderTabla(); renderGoleadores(); renderRol(); renderCaptura();
  renderEquipos(); renderPlantillaSelect(); renderPlantilla();
  renderMiEquipoSelect(); renderMiEquipo(); renderCategorias();
}

function rebuildSelector() {
  const sel = document.getElementById("sel-jornada");
  sel.innerHTML = "";
  RESULTADOS.forEach(j => {
    const o = document.createElement("option");
    o.value = j.num; o.textContent = `Jornada ${j.num}`;
    sel.appendChild(o);
  });
  if (!RESULTADOS.some(j => j.num === jornadaVista) && RESULTADOS[0]) jornadaVista = RESULTADOS[0].num;
  sel.value = jornadaVista;
}
function initSelector() {
  rebuildSelector();
  document.getElementById("sel-jornada").addEventListener("change", e => {
    jornadaVista = +e.target.value; renderTodo();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("liga-nombre").textContent = CONFIG.liga;
  document.getElementById("liga-cat").textContent = `${CONFIG.lema} · ${CONFIG.temporada}`;
  document.title = `${catActiva} · ${CONFIG.lema}`;
  normalizeEquipos();
  rebuildCatSelect();
  initSelector(); initTabs(); llenarSelectEquipos(); cargarPatronUI();
  document.getElementById("sel-categoria").addEventListener("change", e => cambiarCategoria(e.target.value));
  document.getElementById("btn-add-cat").addEventListener("click", () => addCategoria(document.getElementById("cat-nombre").value));
  document.getElementById("categorias-body").addEventListener("click", e => {
    const b = e.target.closest("button[data-catidx]"); if (!b) return;
    const c = CATS[+b.dataset.catidx]; if (!c) return;
    if (b.dataset.act === "ver") cambiarCategoria(c); else delCategoria(c);
  });
  document.getElementById("btn-guardar").addEventListener("click", guardarCaptura);
  document.getElementById("btn-img-tabla").addEventListener("click", generarImagenTabla);
  document.getElementById("btn-img-result").addEventListener("click", generarImagenResultados);
  document.getElementById("btn-img-gol").addEventListener("click", generarImagenGoleadores);
  document.getElementById("btn-img-rol").addEventListener("click", generarImagenRol);
  document.getElementById("btn-add-gol").addEventListener("click", addGoleador);
  document.getElementById("gol-body").addEventListener("click", e => {
    const b = e.target.closest("button[data-acc]"); if (!b) return;
    const idx = +b.dataset.idx;
    if (b.dataset.acc === "inc") ajustarGol(idx, 1);
    else if (b.dataset.acc === "dec") ajustarGol(idx, -1);
    else if (b.dataset.acc === "del") borrarGol(idx);
  });
  document.getElementById("btn-compartir").addEventListener("click", compartirImagen);
  document.getElementById("btn-patron").addEventListener("click", guardarPatron);
  document.getElementById("btn-reset").addEventListener("click", resetTodo);
  document.getElementById("btn-add-eq").addEventListener("click", addEquipo);
  document.getElementById("btn-gen-rol").addEventListener("click", generarRolNuevo);
  document.getElementById("btn-ver-rol").addEventListener("click", verRolCompleto);
  document.getElementById("btn-desc-rol").addEventListener("click", descargarRol);
  document.getElementById("btn-export").addEventListener("click", exportarRespaldo);
  document.getElementById("file-import").addEventListener("change", e => {
    importarRespaldo(e.target.files[0]); e.target.value = "";
  });
  document.getElementById("equipos-body").addEventListener("click", e => {
    const b = e.target.closest("button[data-eqdel]"); if (!b) return;
    delEquipo(+b.dataset.eqdel);
  });
  document.getElementById("sel-equipo-mi").addEventListener("change", renderMiEquipo);
  document.getElementById("sel-equipo-pl").addEventListener("change", renderPlantilla);
  document.getElementById("btn-add-jug").addEventListener("click", addJugador);
  document.getElementById("btn-img-plantilla").addEventListener("click", generarImagenPlantilla);
  document.getElementById("plantilla-body").addEventListener("click", e => {
    const b = e.target.closest("button[data-jugdel]"); if (!b) return;
    delJugador(+b.dataset.jugdel);
  });
  // Render inicial al final: si algo fallara, los botones (incl. Restaurar) ya están enlazados.
  try { renderTodo(); }
  catch (err) { aviso("⚠️ Error al mostrar datos. Usa 'Restaurar datos'."); }
});
