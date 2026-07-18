// ==== CONFIG ====
// Una vez creado el repo real en GitHub, reemplaza esto — se usa para el
// botón "aporta tu caso" y para el link del footer.
const REPO_URL = "https://github.com/TU-USUARIO/imperio-radar";

const PAISES = [
  ["MX", "México"], ["CO", "Colombia"], ["AR", "Argentina"], ["CL", "Chile"],
  ["PE", "Perú"], ["EC", "Ecuador"], ["ES", "España"], ["UY", "Uruguay"],
  ["BO", "Bolivia"], ["PY", "Paraguay"], ["VE", "Venezuela"], ["GT", "Guatemala"],
  ["CR", "Costa Rica"], ["PA", "Panamá"], ["DO", "República Dominicana"],
  ["HN", "Honduras"], ["SV", "El Salvador"], ["NI", "Nicaragua"], ["US", "Estados Unidos"],
];

let RUBROS = [], CAPACIDADES = [], CASOS = [];

async function cargarDatos() {
  const [rubros, capacidades, index] = await Promise.all([
    fetch("rubros.json").then(r => r.json()),
    fetch("capacidades.json").then(r => r.json()),
    fetch("data/index.json").then(r => r.json()),
  ]);
  RUBROS = rubros;
  CAPACIDADES = capacidades;
  CASOS = index.casos || [];
}

function poblarSelects() {
  const paisFiltro = document.getElementById("pais-filtro");
  const paisSelect = document.getElementById("pais-select");
  PAISES.forEach(([id, nombre]) => {
    const opt1 = new Option(nombre, id);
    paisFiltro.add(opt1);
    paisSelect.add(new Option(nombre, id));
  });

  const capSelect = document.getElementById("capacidad-select");
  CAPACIDADES.forEach(c => capSelect.add(new Option(c.nombre, c.id)));

  const rubroSelect = document.getElementById("rubro-select");
  RUBROS.forEach(r => rubroSelect.add(new Option(r.nombre, r.id)));

  document.getElementById("repo-link").href = REPO_URL;
}

function nivelSaturacion(n) {
  if (n === 0) return { label: "Territorio libre", cls: "libre" };
  if (n <= 2) return { label: "Activo", cls: "activo" };
  return { label: "Saturado", cls: "saturado" };
}

function mediana(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function renderRadar() {
  const paisFiltro = document.getElementById("pais-filtro").value;
  const grid = document.getElementById("radar-grid");
  grid.innerHTML = "";

  RUBROS.filter(r => r.id !== "otro").forEach(rubro => {
    const casosRubro = CASOS.filter(c => c.rubro === rubro.id);
    const casosLocales = paisFiltro
      ? casosRubro.filter(c => c.pais === paisFiltro)
      : casosRubro;

    const precios = casosRubro
      .map(c => c.precio_implementacion_usd)
      .filter(p => typeof p === "number");
    const ofertas = casosRubro.map(c => c.que_construyo).filter(Boolean);
    const ofertaFrecuente = ofertas.length
      ? Object.entries(ofertas.reduce((acc, o) => (acc[o] = (acc[o] || 0) + 1, acc), {}))
          .sort((a, b) => b[1] - a[1])[0][0]
      : null;

    const sat = nivelSaturacion(paisFiltro ? casosLocales.length : casosRubro.length);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <p class="sector">${paisFiltro ? "en tu país" : "global"}</p>
      <h3>${rubro.nombre}</h3>
      <div class="stat-row"><span>Casos registrados</span><strong>${paisFiltro ? casosLocales.length : casosRubro.length}</strong></div>
      <div class="stat-row"><span>Ticket típico</span><strong>${precios.length ? "USD " + mediana(precios) : "sin datos"}</strong></div>
      <div class="stat-row"><span>Se vende primero</span><strong>${ofertaFrecuente ? nombreCapacidad(ofertaFrecuente) : "sin datos"}</strong></div>
      <span class="badge ${sat.cls}">${sat.label}</span>
    `;
    grid.appendChild(card);
  });
}

function nombreCapacidad(id) {
  const c = CAPACIDADES.find(x => x.id === id);
  return c ? c.nombre : id;
}

function generarMensaje() {
  const capId = document.getElementById("capacidad-select").value;
  const rubroId = document.getElementById("rubro-select").value;
  const paisId = document.getElementById("pais-select").value;

  const capacidad = CAPACIDADES.find(c => c.id === capId);
  const rubro = RUBROS.find(r => r.id === rubroId);

  const casosRubro = CASOS.filter(c => c.rubro === rubroId);
  const casosLocales = paisId ? casosRubro.filter(c => c.pais === paisId) : [];
  const base = casosLocales.length ? casosLocales : casosRubro;

  const precios = base.map(c => c.precio_implementacion_usd).filter(p => typeof p === "number");
  const precioAncla = precios.length ? mediana(precios) : null;
  const conPrecedente = base.length > 0;
  const dolorCaso = base.find(c => c.dolor_especifico)?.dolor_especifico;
  const dolor = dolorCaso || rubro.dolor_generico;

  const precioTexto = precioAncla
    ? `alrededor de USD ${precioAncla}, según lo que ya se ha cobrado en este rubro`
    : `entre USD 500 y 2.000 (rango típico de un primer proyecto en la comunidad)`;

  const mensaje =
`Hola [nombre]! Tanto tiempo 🙌
Te escribo por algo puntual: estoy montando soluciones con IA para negocios (${capacidad.descripcion}) y estoy eligiendo mis primeros 3 casos de estudio. Me acordé de ti por tu negocio de ${rubro.nombre.toLowerCase()}.

Me regalas 15 min? Te hago unas preguntas sobre cómo manejas el tema de que ${dolor}, y te propongo UNA mejora concreta, con precio cerrado (referencia real: ${precioTexto}). Si te sirve, la hacemos esta misma semana. Si no, te quedas con el diagnóstico gratis igual. ¿Te acomoda esta semana?`;

  document.getElementById("mensaje-texto").textContent = mensaje;

  const sat = nivelSaturacion(casosLocales.length);
  const metaBits = [
    `nicho: ${rubro.nombre}`,
    paisId ? `país: ${PAISES.find(p => p[0] === paisId)?.[1] || paisId}` : "país: no filtrado",
    `respaldo: ${base.length} caso(s) ${conPrecedente ? "reales" : ""}`,
    `saturación local: ${sat.label.toLowerCase()}`,
  ];
  document.getElementById("mensaje-meta").innerHTML = metaBits.map(b => `<span>${b}</span>`).join("");

  document.getElementById("output").classList.add("show");
}

function setupEventos() {
  document.getElementById("pais-filtro").addEventListener("change", renderRadar);
  document.getElementById("generar-btn").addEventListener("click", generarMensaje);
  document.getElementById("copiar-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("mensaje-texto").textContent);
    const btn = document.getElementById("copiar-btn");
    const original = btn.textContent;
    btn.textContent = "Copiado ✓";
    setTimeout(() => (btn.textContent = original), 1500);
  });
  document.getElementById("aportar-btn").addEventListener("click", () => {
    window.open(`${REPO_URL}/blob/main/casos/README.md`, "_blank");
  });
}

(async function init() {
  await cargarDatos();
  poblarSelects();
  renderRadar();
  setupEventos();
})();
