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

  // Si elige "Otro rubro", pedimos el detalle en texto libre — así no se pierde
  // el dato y el catálogo puede crecer con lo que la comunidad realmente vende.
  afRubro.addEventListener("change", () => {
    const esOtro = afRubro.value === "otro";
    document.getElementById("af-rubro-otro-row").style.display = esOtro ? "" : "none";
    document.getElementById("af-rubro-otro").required = esOtro;
  });

  document.getElementById("repo-link").href = REPO_URL;
}

function formatearFecha(iso) {
  const [y, m, d] = String(iso).split("-");
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(d)} ${meses[Number(m) - 1]} ${y}`;
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

function listaCasosHtml(casos) {
  return casos.map(c => `
    <li>
      <div class="caso-autor">${c.autor}${c.pais ? ` · ${c.pais}` : ""}${c.fecha_cierre ? ` · ${formatearFecha(c.fecha_cierre)}` : ""}</div>
      <div class="caso-detalle-texto">${c.rubro === "otro" && c.rubro_otro ? `${c.rubro_otro} · ` : ""}${nombreCapacidad(c.que_construyo)}${typeof c.precio_implementacion === "number" ? ` · ${MONEDA_SIMBOLO[c.moneda] || c.moneda} ${c.precio_implementacion}` : ""}</div>
      <div class="caso-links">
        ${c.perfil_skool ? `<a href="${c.perfil_skool}" target="_blank" rel="noopener">Perfil de Skool</a>` : ""}
        ${c.link_caso ? `<a href="${c.link_caso}" target="_blank" rel="noopener">Ver post de cierre</a>` : ""}
        ${!c.perfil_skool && !c.link_caso ? `<span class="sin-contacto">sin contacto compartido</span>` : ""}
      </div>
    </li>
  `).join("");
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
    const casosParaListar = (paisFiltro ? casosLocales : casosRubro)
      .slice().sort((a, b) => (b.fecha_cierre || "").localeCompare(a.fecha_cierre || ""));

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <p class="sector">${paisFiltro ? "en tu país" : "global"}</p>
      <h3>${rubro.nombre}</h3>
      <div class="stat-row"><span>Casos registrados</span><strong>${paisFiltro ? casosLocales.length : casosRubro.length}</strong></div>
      <div class="stat-row"><span>Ticket típico</span><strong>${ticketTexto}</strong></div>
      <div class="stat-row"><span>Se vende primero</span><strong>${ofertaFrecuente ? nombreCapacidad(ofertaFrecuente) : "sin datos"}</strong></div>
      <span class="badge ${sat.cls}">${sat.label}</span>
      ${casosParaListar.length ? `
        <details class="casos-detalle">
          <summary>Ver ${casosParaListar.length === 1 ? "el caso real" : `los ${casosParaListar.length} casos reales`}</summary>
          <ul>${listaCasosHtml(casosParaListar)}</ul>
        </details>
      ` : ""}
    `;
    grid.appendChild(card);
  });

  renderCardOtros(paisFiltro, grid);
}

// Los casos con rubro "otro" no encajan en ninguna tarjeta fija del catálogo,
// pero igual deben ser visibles — así la comunidad ve qué rubros nuevos están
// apareciendo y se puede decidir agregarlos a rubros.json.
function renderCardOtros(paisFiltro, grid) {
  const casosOtro = CASOS.filter(c => c.rubro === "otro");
  const casosLocales = paisFiltro ? casosOtro.filter(c => c.pais === paisFiltro) : casosOtro;
  if (!casosLocales.length) return;

  const casosParaListar = casosLocales
    .slice()
    .sort((a, b) => (b.fecha_cierre || "").localeCompare(a.fecha_cierre || ""));

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <p class="sector">${paisFiltro ? "en tu país" : "global"}</p>
    <h3>Otros rubros</h3>
    <div class="stat-row"><span>Casos registrados</span><strong>${casosLocales.length}</strong></div>
    <p class="section-sub" style="margin:8px 0 0;">Rubros fuera del catálogo cerrado — si uno se repite, vale la pena agregarlo a <code>rubros.json</code>.</p>
    <details class="casos-detalle" open>
      <summary>Ver ${casosParaListar.length === 1 ? "el caso real" : `los ${casosParaListar.length} casos reales`}</summary>
      <ul>${listaCasosHtml(casosParaListar)}</ul>
    </details>
  `;
  grid.appendChild(card);
}

function nombreCapacidad(id) {
  const c = CAPACIDADES.find(x => x.id === id);
  return c ? c.nombre : id;
}

async function manejarAporte(e) {
  e.preventDefault();
  const nota = document.getElementById("af-nota");
  const submitBtn = document.getElementById("af-submit");

  // Honeypot: si un bot llenó este campo invisible, lo descartamos en silencio.
  if (document.getElementById("af-web").value) {
    nota.textContent = "Gracias.";
    document.getElementById("aportar-form").reset();
    return;
  }

  const autor = document.getElementById("af-autor").value.trim();
  const perfil = document.getElementById("af-perfil").value.trim() || null;
  const pais = document.getElementById("af-pais").value;
  const rubro = document.getElementById("af-rubro").value;
  const rubroOtro = document.getElementById("af-rubro-otro").value.trim() || null;
  const construyo = document.getElementById("af-construyo").value;
  const dolor = document.getElementById("af-dolor").value.trim();
  const precioStr = document.getElementById("af-precio").value.trim();
  const moneda = document.getElementById("af-moneda").value;
  const mantStr = document.getElementById("af-mantenimiento").value.trim();
  const diasStr = document.getElementById("af-dias").value.trim();
  const origen = document.getElementById("af-origen").value;
  const yaTenia = document.getElementById("af-yatenia").value === "true";
  const link = document.getElementById("af-link").value.trim() || null;

  if (!autor || !pais || !rubro || !construyo || !dolor || !precioStr || isNaN(Number(precioStr))) {
    nota.textContent = "Faltan campos obligatorios — revisa nombre, país, rubro, qué construiste, dolor y precio.";
    return;
  }
  if (rubro === "otro" && !rubroOtro) {
    nota.textContent = "Contanos cuál es el rubro de tu cliente — así lo podemos sumar al catálogo.";
    return;
  }

  const payload = {
    autor,
    perfil_skool: perfil,
    pais,
    rubro,
    rubro_otro: rubro === "otro" ? rubroOtro : null,
    que_construyo: construyo,
    dolor_especifico: dolor,
    precio_implementacion: Number(precioStr),
    moneda,
    mantenimiento_mensual: mantStr && !isNaN(Number(mantStr)) ? Number(mantStr) : null,
    tiempo_hasta_cobro_dias: diasStr && !isNaN(Number(diasStr)) ? Number(diasStr) : null,
    origen_cliente: origen,
    ya_tenia_cliente: yaTenia,
    link_caso: link,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";
  nota.textContent = "";

  try {
    const res = await fetch("/api/aportar-caso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();

    if (result.ok) {
      nota.innerHTML =
        `Listo — tu caso quedó registrado y se abrió un Pull Request para revisión. ` +
        (result.prUrl ? `<a href="${result.prUrl}" target="_blank" rel="noopener">Ver el PR aquí</a>. ` : "") +
        `En cuanto se apruebe, va a aparecer en el Radar.`;
      document.getElementById("aportar-form").reset();
      document.getElementById("af-rubro-otro-row").style.display = "none";
      document.getElementById("af-rubro-otro").required = false;
    } else {
      nota.textContent = result.error || "Algo falló al enviar tu caso. Intenta de nuevo.";
    }
  } catch (err) {
    nota.textContent = "No se pudo conectar. Revisa tu conexión e intenta de nuevo.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Aportar caso";
  }
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
