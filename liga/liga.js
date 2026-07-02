/* =======================================================================
   MOTOR DE LA LIGA — cálculo de tabla, goleadores, rol, captura e imágenes.
   Sin librerías externas: corre en cualquier navegador.
   ======================================================================= */

const LS_RESULTADOS = "liga_quinta_resultados_v1";
const LS_GOLEADORES = "liga_quinta_goleadores_v1";
const LS_PATRON     = "liga_quinta_patrocinador_v1";

let RESULTADOS = cargar(LS_RESULTADOS, JORNADAS);
let GOLES      = cargar(LS_GOLEADORES, GOLEADORES);
let PATRON     = cargar(LS_PATRON, CONFIG.patrocinador);
let jornadaVista = 29;

function cargar(clave, porDefecto) {
  try {
    const g = localStorage.getItem(clave);
    return g ? JSON.parse(g) : structuredClone(porDefecto);
  } catch (e) { return structuredClone(porDefecto); }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
}

/* -------------------- 1) CÁLCULO DE LA TABLA -------------------- */
function calcularTabla(hastaJornada) {
  const map = {};
  BASE.forEach(b => map[b.equipo] = { ...b });
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
        <td class="eq">${g.jugador}<span class="sub">${g.equipo}</span></td>
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
  if (sel.options.length) return;
  BASE.map(b => b.equipo).sort((a, b) => a.localeCompare(b)).forEach(nom => {
    const o = document.createElement("option"); o.value = nom; o.textContent = nom; sel.appendChild(o);
  });
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
  j.partidos.forEach(p => {
    const jug = p.gl != null && p.gv != null;
    const row = document.createElement("div");
    row.className = "rol-row";
    const centro = jug ? `<span class="rol-sc">${p.gl} - ${p.gv}</span>` : `<span class="rol-vs">vs</span>`;
    const sello = p.def ? `<span class="sello">default</span>` : "";
    const meta = (p.hora || p.campo)
      ? `<div class="rol-meta">${p.hora ? "🕐 " + p.hora : ""}${p.campo ? " · 📍 " + p.campo : ""}</div>` : "";
    row.innerHTML = `
      <div class="rol-line">
        <span class="rol-loc">${p.loc}</span>
        ${centro}
        <span class="rol-vis">${p.vis} ${sello}</span>
      </div>${meta}`;
    cont.appendChild(row);
  });
  document.getElementById("rol-titulo").textContent = `Rol · Jornada ${jornadaVista}`;
}

/* -------------------- 5) CAPTURA -------------------- */
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
    const i = +inp.dataset.i, lado = inp.dataset.lado, v = inp.value.trim();
    j.partidos[i][lado] = v === "" ? null : Math.max(0, parseInt(v, 10) || 0);
  });
  guardar(LS_RESULTADOS, RESULTADOS);
  renderTodo();
  aviso("✅ Jornada guardada. La tabla ya se actualizó.");
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
  c.fillText(`Categoría ${CONFIG.categoria}`, PAD, 130);
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
  fondo(c, W, H, jugada(jornadaVista) ? `Tabla tras la Jornada ${jornadaVista}` : `Jornada ${jornadaVista}`);

  const yCols = headH - 22;
  c.fillStyle = "#8FB6A0"; c.font = "700 24px system-ui, Arial";
  c.textAlign = "left"; c.fillText("#", PAD, yCols); c.fillText("EQUIPO", PAD + 56, yCols);
  c.textAlign = "right"; c.fillText("PJ", W - 300, yCols); c.fillText("DIF", W - 170, yCols); c.fillText("PTS", W - PAD, yCols);

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

  const yCorte = headH + CONFIG.clasifican * rowH;
  c.textAlign = "left"; c.fillStyle = "#12905A"; c.font = "700 20px system-ui, Arial";
  c.fillText(`▲  ZONA DE CLASIFICACIÓN (primeros ${CONFIG.clasifican})`, PAD, yCorte + 30);

  footer(c, W, H);
  mostrarImagen(cv, `tabla-quinta-j${jornadaVista}`);
}

function generarImagenResultados() {
  const j = RESULTADOS.find(x => x.num === jornadaVista);
  const rowH = 92, headH = 240, W = IMG_W;
  const H = headH + rowH * j.partidos.length + 150 + 20;
  const cv = document.getElementById("lienzo"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  fondo(c, W, H, `Resultados · Jornada ${jornadaVista}`);

  j.partidos.forEach((p, i) => {
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
  mostrarImagen(cv, `resultados-quinta-j${jornadaVista}`);
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
  mostrarImagen(cv, "goleadores-quinta");
}

function generarImagenRol() {
  const j = RESULTADOS.find(x => x.num === jornadaVista);
  const rowH = 104, headH = 240, W = IMG_W;
  const H = headH + rowH * j.partidos.length + 150 + 20;
  const cv = document.getElementById("lienzo"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  fondo(c, W, H, `Rol · Jornada ${jornadaVista}`);
  j.partidos.forEach((p, i) => {
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
  mostrarImagen(cv, `rol-quinta-j${jornadaVista}`);
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
      await navigator.share({ files: [file], title: `Liga ${CONFIG.categoria}`,
        text: `${CONFIG.lema} · Categoría ${CONFIG.categoria}` });
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

/* -------------------- Pestañas, utilidades y arranque -------------------- */
function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => { x.classList.remove("active"); x.setAttribute("aria-selected", "false"); });
    t.classList.add("active"); t.setAttribute("aria-selected", "true");
    document.querySelectorAll(".tabpanel").forEach(p => p.hidden = true);
    document.getElementById("panel-" + t.dataset.tab).hidden = false;
  }));
}

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

function renderTodo() { renderTabla(); renderGoleadores(); renderRol(); renderCaptura(); }

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
  initSelector(); initTabs(); llenarSelectEquipos(); cargarPatronUI(); renderTodo();
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
});
