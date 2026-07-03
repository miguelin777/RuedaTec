/* Pruebas de humo de la app de la liga (sin navegador, con jsdom).
   Uso:  cd liga/test && npm install && npm test
   Carga index.html + data.js + liga.js en un DOM simulado, dispara el
   arranque y verifica tabla, goleadores, rol, pestañas, captura, plantillas,
   Mi equipo, escenarios, Admin, round-robin y respaldo. */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..") + "/";

let html = fs.readFileSync(DIR + "index.html", "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
const dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "outside-only" });
const { window } = dom;
window.structuredClone = structuredClone;

const code = fs.readFileSync(DIR + "data.js", "utf8") + "\n" + fs.readFileSync(DIR + "liga.js", "utf8");
window.eval(code);
window.document.dispatchEvent(new window.Event("DOMContentLoaded"));

const $ = s => window.document.querySelector(s);
const $$ = s => [...window.document.querySelectorAll(s)];
let fails = 0;
function check(name, cond, extra = "") {
  console.log((cond ? "  ✓ " : "  ✗ ") + name + (cond ? "" : "  << " + extra));
  if (!cond) fails++;
}

console.log("— Tabla (vista J29 por defecto) —");
const filas = $$("#tabla-body tr");
check("15 equipos en la tabla", filas.length === 15, "hay " + filas.length);
const r1 = filas[0].querySelectorAll("td");
check("1° = Papirrines", r1[1].textContent === "Papirrines", r1[1].textContent);
check("Papirrines = 47 pts", r1[9].textContent === "47", r1[9].textContent);
const sparta = filas.find(tr => tr.querySelectorAll("td")[1].textContent === "Sparta");
check("Sparta 8° con 33 pts", sparta.querySelectorAll("td")[0].textContent === "8" &&
  sparta.querySelectorAll("td")[9].textContent === "33");

console.log("— Goleadores —");
check("5 goleadores", $$("#gol-body tr").length === 5);
check("líder = Miguel Flores (35)", $("#gol-body tr td.eq").textContent.includes("Miguel Flores"));

console.log("— Rol J29 —");
check("8 partidos en el rol", $$("#rol-body .rol-row").length === 8);

console.log("— Pestañas —");
$$(".tab").find(t => t.dataset.tab === "goleadores").dispatchEvent(new window.Event("click"));
check("panel Tabla oculto al abrir Goleadores", $("#panel-tabla").hidden === true);
check("panel Goleadores visible", $("#panel-goleadores").hidden === false);

console.log("— Captura de punta a punta (J30: Sparta 3-2 América) —");
const sel = $("#sel-jornada"); sel.value = "30"; sel.dispatchEvent(new window.Event("change"));
$('#captura-body input[data-i="2"][data-lado="gl"]').value = "3";
$('#captura-body input[data-i="2"][data-lado="gv"]').value = "2";
$("#btn-guardar").dispatchEvent(new window.Event("click"));
const filas30 = $$("#tabla-body tr");
const sp30 = filas30.find(tr => tr.querySelectorAll("td")[1].textContent === "Sparta");
const am30 = filas30.find(tr => tr.querySelectorAll("td")[1].textContent === "Dep. América");
const posSp = +sp30.querySelectorAll("td")[0].textContent, posAm = +am30.querySelectorAll("td")[0].textContent;
check("Sparta gana y sube a 35 pts", sp30.querySelectorAll("td")[9].textContent === "35",
  sp30.querySelectorAll("td")[9].textContent);
check("Sparta queda arriba de América", posSp < posAm, `Sparta ${posSp}, América ${posAm}`);
check("persistió en localStorage", !!window.localStorage.getItem("liga_quinta_resultados_v1"));

console.log("— Goleadores editables —");
$$(".tab").find(t => t.dataset.tab === "goleadores").dispatchEvent(new window.Event("click"));
$('#gol-body button[data-acc="inc"]').dispatchEvent(new window.Event("click", { bubbles: true }));
check("líder sube a 36 con +1", $("#gol-body tr td.pts").textContent === "36",
  $("#gol-body tr td.pts").textContent);
$("#g-nombre").value = "Pruebas Tester";
$("#g-equipo").value = "Sparta";
$("#g-goles").value = "40";
$("#btn-add-gol").dispatchEvent(new window.Event("click"));
check("nuevo goleador encabeza (40 goles)", $("#gol-body tr td.eq").textContent.includes("Pruebas Tester"));
check("equipos en el select", $$("#g-equipo option").length === 15);

console.log("— Admin: equipos —");
$$(".tab").find(t => t.dataset.tab === "admin").dispatchEvent(new window.Event("click", { bubbles: true }));
check("15 equipos al inicio", $("#eq-count").textContent === "15 equipos", $("#eq-count").textContent);
$("#eq-nombre").value = "Nuevo FC";
$("#btn-add-eq").dispatchEvent(new window.Event("click"));
check("ahora 16 equipos", $("#eq-count").textContent === "16 equipos", $("#eq-count").textContent);
$$(".tab").find(t => t.dataset.tab === "tabla").dispatchEvent(new window.Event("click", { bubbles: true }));
check("tabla con 16 equipos", $$("#tabla-body tr").length === 16, $$("#tabla-body tr").length);
check("Nuevo FC en select goleadores (16)", $$("#g-equipo option").length === 16);

console.log("— Plantillas (roster por equipo) —");
$$(".tab").find(t => t.dataset.tab === "plantillas").dispatchEvent(new window.Event("click", { bubbles: true }));
check("select de equipos poblado (16)", $$("#sel-equipo-pl option").length === 16, $$("#sel-equipo-pl option").length);
$("#sel-equipo-pl").value = "Sparta"; $("#sel-equipo-pl").dispatchEvent(new window.Event("change"));
$("#pl-num").value = "10"; $("#pl-nombre").value = "Juan Capitán";
$("#btn-add-jug").dispatchEvent(new window.Event("click"));
$("#pl-num").value = "1"; $("#pl-nombre").value = "Portero Uno";
$("#btn-add-jug").dispatchEvent(new window.Event("click"));
check("2 jugadores en Sparta", $("#pl-count").textContent === "2 jugadores", $("#pl-count").textContent);
check("orden por número (1 primero)", $("#plantilla-body .pl-num").textContent === "1",
  $("#plantilla-body .pl-num").textContent);

console.log("— Mi equipo (vista jugador) —");
$$(".tab").find(t => t.dataset.tab === "miequipo").dispatchEvent(new window.Event("click", { bubbles: true }));
$("#sel-equipo-mi").value = "Papirrines"; $("#sel-equipo-mi").dispatchEvent(new window.Event("change"));
check("hero muestra mi equipo", $("#miequipo-body .mi-eq").textContent === "Papirrines",
  $("#miequipo-body .mi-eq") && $("#miequipo-body .mi-eq").textContent);
check("próximo partido vs Santa Fe (J30)",
  $("#miequipo-body .mi-vs").textContent.includes("Santa Fe") &&
  $("#miequipo-body .mi-meta").textContent.includes("Jornada 30"));
check("forma con ≥4 partidos jugados", $$("#miequipo-body .forma .f-badge").length >= 4,
  $$("#miequipo-body .forma .f-badge").length);
check("tarjeta de escenario presente", !!$("#miequipo-body .esc-verdicto") &&
  $("#miequipo-body .esc-verdicto").textContent.length > 0);
check("líder Papirrines: clasificación asegurada",
  /asegurada|zona/i.test($("#miequipo-body .esc-verdicto").textContent),
  $("#miequipo-body .esc-verdicto") && $("#miequipo-body .esc-verdicto").textContent);
check("proyección 'si ganas tu próximo' presente", !!$("#miequipo-body .esc-proy"));

console.log("— Robustez (equipo nuevo, escape de HTML) —");
$$(".tab").find(t => t.dataset.tab === "plantillas").dispatchEvent(new window.Event("click", { bubbles: true }));
$("#sel-equipo-pl").value = "Nuevo FC"; $("#sel-equipo-pl").dispatchEvent(new window.Event("change"));
check("equipo nuevo usable en Plantillas (sin crash)", $("#pl-count").textContent === "0 jugadores",
  $("#pl-count").textContent);
$$(".tab").find(t => t.dataset.tab === "admin").dispatchEvent(new window.Event("click", { bubbles: true }));
$("#eq-nombre").value = "<b>Hack</b>"; $("#btn-add-eq").dispatchEvent(new window.Event("click"));
const hackRow = $$("#equipos-body .eq-nom").find(el => el.textContent === "<b>Hack</b>");
check("nombre con HTML se escapa (no inyecta)", !!hackRow && hackRow.querySelector("b") === null);

console.log("— Admin: generar rol round-robin (17 = impar, con descanso) + reinicio —");
window.confirm = () => true;
$("#btn-gen-rol").dispatchEvent(new window.Event("click"));
check("17 equipos → 17 jornadas", $$("#sel-jornada option").length === 17, $$("#sel-jornada option").length);
check("round-robin impar maneja descanso (bye)", window.rolATexto().includes("descansa"));
check("rol en texto incluye 'Jornada 1'", window.rolATexto().includes("Jornada 1"));
$$(".tab").find(t => t.dataset.tab === "tabla").dispatchEvent(new window.Event("click", { bubbles: true }));
const todos0 = $$("#tabla-body tr").every(tr => tr.querySelectorAll("td")[9].textContent === "0");
check("temporada reiniciada (todos 0 pts)", todos0);

console.log("— Respaldo export/import —");
const bkp = JSON.parse(JSON.stringify(window.respaldoData()));
check("respaldo trae equipos y resultados", Array.isArray(bkp.equipos) && Array.isArray(bkp.resultados));
bkp.equipos[0].equipo = "RESPALDO FC";
check("importar respaldo válido devuelve true", window.aplicarRespaldo(bkp) === true);
$$(".tab").find(t => t.dataset.tab === "admin").dispatchEvent(new window.Event("click", { bubbles: true }));
check("importar aplica los cambios", $$("#equipos-body .eq-nom").some(el => el.textContent === "RESPALDO FC"));
check("importar inválido no crashea (devuelve false)", window.aplicarRespaldo({ foo: 1 }) === false);

console.log("\n" + (fails === 0 ? "✅ TODO OK (" + $$(".tab").length + " secciones)" : "❌ " + fails + " fallos"));
process.exit(fails ? 1 : 0);
