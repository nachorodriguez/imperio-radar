// Recorre /casos/**/*.json y genera public/data/index.json
// Corre automáticamente en cada build de Netlify (ver netlify.toml).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CASOS_DIR = path.join(ROOT, "casos");
const OUT_FILE = path.join(ROOT, "public", "data", "index.json");

function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(full));
    } else if (entry.name.endsWith(".json") && !entry.name.startsWith("_")) {
      files.push(full);
    }
  }
  return files;
}

function copiarCatalogos() {
  // rubros.json y capacidades.json viven en la raíz del repo (fuente de verdad,
  // fáciles de editar por PR) pero deben quedar dentro de /public para que
  // Netlify los sirva junto al resto del sitio estático.
  for (const nombre of ["rubros.json", "capacidades.json"]) {
    fs.copyFileSync(path.join(ROOT, nombre), path.join(ROOT, "public", nombre));
  }
}

function build() {
  copiarCatalogos();
  const files = walk(CASOS_DIR);
  const casos = [];
  const errores = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, "utf8");
      const data = JSON.parse(raw);
      casos.push(data);
    } catch (err) {
      errores.push({ file, error: err.message });
    }
  }

  if (errores.length) {
    console.error("Errores al leer casos:", errores);
    process.exitCode = 1;
  }

  const index = {
    generado_en: new Date().toISOString(),
    total_casos: casos.length,
    casos,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(index, null, 2));
  console.log(`index.json generado con ${casos.length} casos.`);
}

build();
