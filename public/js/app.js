// ==== CONFIG ====
// Confirmado desde el deploy de Netlify — verifica que coincide con tu repo real.
const REPO_URL = "https://github.com/nachorodriguez/imperio-radar";

const PAIS_MONEDA = {
  MX: "MXN", CO: "COP", AR: "ARS", CL: "CLP", PE: "PEN", EC: "USD",
  ES: "EUR", UY: "UYU", BO: "BOB", PY: "PYG", VE: "VES", GT: "GTQ",
  CR: "CRC", PA: "USD", DO: "DOP", HN: "HNL", SV: "USD", NI: "NIO", US: "USD",
};

const MONEDA_SIMBOLO = {
  USD: "USD", EUR: "€", MXN: "MX$", COP: "COP$", ARS: "AR$", CLP: "CLP$",
  PEN: "S/", UYU: "UY$", BOB: "Bs", PYG: "₲", VES: "Bs.S", GTQ: "Q",
  CRC: "₡", DOP: "RD$", HNL: "L", NIO: "C$",
};

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
  const afPais = document.getElementById("af-pais");
  const afMoneda = document.getElementById("af-moneda");
  PAISES.forEach(([id, nombre]) => {
    paisFiltro.add(new Option(nombre, id));
    paisSelect.add(new Option(nombre, id));
    afPais.add(new Option(nombre, id));
  });
  Object.entries(MONEDA_SIMBOLO).forEach(([codigo, simbolo]) => {
    afMoneda.add(new Option(`${codigo} (${simbolo})`, codigo));
  });

  const capSelect = document.getElementById("capacidad-select");
  const afConstruyo = document.getElementById("af-construyo");
  CAPACIDADES.forEach(c => {
    capSelect.add(new Option(c.nombre, c.id));
    afConstruyo.add(new Option(c.nombre, c.id));
  });

  const rubroSelect = document.getElementById("rubro-select");
  const afRubro = document.getElementById("af-rubro");
  RUBROS.forEach(r => {
    rubroSelect.add(new Option(r.nombre, r.id));
    afRubro.add(new Option(r.nombre, r.id));
  });

  // Auto-sugiere la moneda cuando cambia el país del formulario de aporte.
  afPais.addEventListener("change", () => {
    const sugerida = PAIS_MONEDA[afPais.value];
    if (sugerida) afMoneda.value = sugerida;
  });

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

    const monedaLocal = PAIS_MONEDA[paisFiltro];
    const casosMismaMoneda = casosLocales.filter(
      c => typeof c.precio_implementacion === "number" && c.moneda === monedaLocal
    );

    let ticketTexto;
    if (casosMismaMoneda.length) {
      const simbolo = MONEDA_SIMBOLO[monedaLocal] || monedaLocal;
      ticketTexto = `${simbolo} ${mediana(casosMismaMoneda.map(c => c.precio_implementacion))}`;
    } else {
      const preciosUsd = casosRubro.map(c => c.precio_implementacion_usd).filter(p => typeof p === "number");
      ticketTexto = preciosUsd.length ? `USD ${mediana(preciosUsd)} · global` : "sin datos";
    }

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
      <div class="stat-row"><span>Ticket típico</span><strong>${ticketTexto}</strong></div>
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

function slugify(str) {
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function manejarAporte(e) {
  e.preventDefault();
  const autor = document.getElementById("af-autor").value.trim();
  const perfil = document.getElementById("af-perfil").value.trim() || null;
  const pais = document.getElementById("af-pais").value;
  const rubro = document.getElementById("af-rubro").value;
  const construyo = document.getElementById("af-construyo").value;
  const dolor = document.getElementById("af-dolor").value.trim();
  const precioStr = document.getElementById("af-precio").value.trim();
  const moneda = document.getElementById("af-moneda").value;
  const mantStr = document.getElementById("af-mantenimiento").value.trim();
  const diasStr = document.getElementById("af-dias").value.trim();
  const origen = document.getElementById("af-origen").value;
  const yaTenia = document.getElementById("af-yatenia").value === "true";
  const link = document.getElementById("af-link").value.trim() || null;
  const nota = document.getElementById("af-nota");

  if (!autor || !pais || !rubro || !construyo || !dolor || !precioStr || isNaN(Number(precioStr))) {
    nota.textContent = "Faltan campos obligatorios — revisa nombre, país, rubro, qué construiste, dolor y precio.";
    return;
  }

  const precio = Number(precioStr);
  const mantenimiento = mantStr && !isNaN(Number(mantStr)) ? Number(mantStr) : null;
  const dias = diasStr && !isNaN(Number(diasStr)) ? Number(diasStr) : null;
  const fecha = hoyISO();
  const slug = slugify(autor) || "imperial";
  const id = `${fecha}-${slug}`;

  const caso = {
    id,
    autor,
    perfil_skool: perfil,
    pais,
    fecha_cierre: fecha,
    rubro,
    rubro_otro: null,
    dolor_especifico: dolor,
    que_construyo: construyo,
    ya_tenia_cliente: yaTenia,
    precio_implementacion: precio,
    moneda,
    // No convertimos monedas: solo se llena si el propio caso ya está en USD.
    precio_implementacion_usd: moneda === "USD" ? precio : null,
    mantenimiento_mensual: mantenimiento,
    mantenimiento_moneda: mantenimiento ? moneda : null,
    tiempo_hasta_cobro_dias: dias,
    origen_cliente: origen,
    mensaje_usado: null,
    link_caso: link,
    tags: ["comunidad"],
  };

  const filename = `casos/${pais}/${id}.json`;
  const contenido = JSON.stringify(caso, null, 2);
  const url = `${REPO_URL}/new/main?filename=${encodeURIComponent(filename)}&value=${encodeURIComponent(contenido)}`;

  window.open(url, "_blank");

  nota.innerHTML =
    `Se abrió GitHub en una pestaña nueva con <code>${filename}</code> ya armado. ` +
    `Si no colaboras directo en el repo, GitHub te va a ofrecer crear tu propia copia (fork) — acepta y dale a <strong>Propose new file</strong>, eso abre el Pull Request solo. ` +
    `Si ya colaboras en el repo, elige <strong>Create a new branch for this commit and start a pull request</strong> en vez de comitear directo a main.`;
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

  const conPrecedente = base.length > 0;
  const dolorCaso = base.find(c => c.dolor_especifico)?.dolor_especifico;
  const dolor = dolorCaso || rubro.dolor_generico;

  // Prioridad 1: casos reales EN tu país, declarados en tu propia moneda local.
  const monedaLocal = PAIS_MONEDA[paisId];
  const casosMismaMoneda = casosLocales.filter(
    c => typeof c.precio_implementacion === "number" && c.moneda === monedaLocal
  );

  // Prioridad 2: referencia global en USD (nunca se convierte, se etiqueta como tal).
  const preciosUsdGlobal = base.map(c => c.precio_implementacion_usd).filter(p => typeof p === "number");
  const precioAnclaUsd = preciosUsdGlobal.length ? mediana(preciosUsdGlobal) : null;

  let precioTexto;
  if (casosMismaMoneda.length) {
    const precioLocal = mediana(casosMismaMoneda.map(c => c.precio_implementacion));
    const simbolo = MONEDA_SIMBOLO[monedaLocal] || monedaLocal;
    precioTexto = `alrededor de ${simbolo} ${precioLocal} — dato real de un caso cerrado en tu país`;
  } else if (precioAnclaUsd) {
    precioTexto = `alrededor de USD ${precioAnclaUsd} — referencia global, todavía no hay un caso registrado en tu moneda local`;
  } else {
    precioTexto = `entre USD 500 y 2.000 — rango típico de un primer proyecto en la comunidad (referencia global)`;
  }

  const mensaje =
`Hola [nombre]! Tanto tiempo 🙌
Te escribo por algo puntual: estoy montando soluciones con IA para negocios (${capacidad.descripcion}) y estoy eligiendo mis primeros 3 casos de estudio. Me acordé de ti por tu negocio de ${rubro.nombre.toLowerCase()}.

¿Tienes 15 minutos? Te hago unas preguntas sobre cómo manejas el tema de que ${dolor}, y te propongo UNA mejora concreta, con precio cerrado (referencia real: ${precioTexto}). Si te sirve, la hacemos esta misma semana. Si no, te quedas con el diagnóstico gratis igual. ¿Te viene bien esta semana?`;

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
    document.getElementById("aportar").scrollIntoView({ behavior: "smooth" });
    document.getElementById("af-autor").focus();
  });
  document.getElementById("aportar-form").addEventListener("submit", manejarAporte);
}

(async function init() {
  await cargarDatos();
  poblarSelects();
  renderRadar();
  setupEventos();
})();
