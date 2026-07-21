import type { Context, Config } from "@netlify/functions";

const OWNER = "nachorodriguez";
const REPO = "imperio-radar";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

function slugify(str: string): string {
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function gh(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${path} -> ${res.status}: ${body}`);
  }
  return res.json();
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método no permitido" }), { status: 405 });
  }

  const token = Netlify.env.get("GITHUB_TOKEN");
  if (!token) {
    return new Response(
      JSON.stringify({ ok: false, error: "Falta configurar GITHUB_TOKEN en las variables de entorno de Netlify" }),
      { status: 500 }
    );
  }

  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "JSON inválido" }), { status: 400 });
  }

  // Honeypot anti-spam: un campo invisible para humanos que solo un bot llenaría.
  if (data.web) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const autor = String(data.autor || "").trim();
  const perfilSkool = data.perfil_skool ? String(data.perfil_skool).trim() : null;
  const pais = String(data.pais || "").trim();
  const rubro = String(data.rubro || "").trim();
  const rubroOtro = data.rubro_otro ? String(data.rubro_otro).trim() : null;
  const queConstruyo = String(data.que_construyo || "").trim();
  const queConstruyoOtro = data.que_construyo_otro ? String(data.que_construyo_otro).trim() : null;
  const dolorEspecifico = String(data.dolor_especifico || "").trim();
  const precioImplementacion = Number(data.precio_implementacion);
  const moneda = String(data.moneda || "").trim();
  const mantenimientoMensual = data.mantenimiento_mensual !== undefined && data.mantenimiento_mensual !== ""
    ? Number(data.mantenimiento_mensual) : null;
  const tiempoHastaCobroDias = data.tiempo_hasta_cobro_dias !== undefined && data.tiempo_hasta_cobro_dias !== ""
    ? Number(data.tiempo_hasta_cobro_dias) : null;
  const origenCliente = data.origen_cliente ? String(data.origen_cliente) : null;
  const yaTeniaCliente = !!data.ya_tenia_cliente;
  const linkCaso = data.link_caso ? String(data.link_caso).trim() : null;

  if (!autor || !pais || !rubro || !queConstruyo || !dolorEspecifico ||
      !Number.isFinite(precioImplementacion) || !moneda) {
    return new Response(JSON.stringify({ ok: false, error: "Faltan campos obligatorios" }), { status: 400 });
  }
  if (rubro === "otro" && !rubroOtro) {
    return new Response(JSON.stringify({ ok: false, error: "Falta indicar cuál es el rubro" }), { status: 400 });
  }
  if (queConstruyo === "otro" && !queConstruyoOtro) {
    return new Response(JSON.stringify({ ok: false, error: "Falta indicar qué construiste" }), { status: 400 });
  }

  const fecha = hoyISO();
  const slug = slugify(autor) || "imperial";
  const sufijo = Math.random().toString(36).slice(2, 6);
  const id = `${fecha}-${slug}-${sufijo}`;
  const branch = `aporte-${id}`;
  const filename = `casos/${pais}/${id}.json`;

  const caso = {
    id,
    autor,
    perfil_skool: perfilSkool,
    pais,
    fecha_cierre: fecha,
    rubro,
    rubro_otro: rubro === "otro" ? rubroOtro : null,
    dolor_especifico: dolorEspecifico,
    que_construyo: queConstruyo,
    que_construyo_otro: queConstruyo === "otro" ? queConstruyoOtro : null,
    ya_tenia_cliente: yaTeniaCliente,
    precio_implementacion: precioImplementacion,
    moneda,
    // Nunca se convierte: solo se llena si el propio caso ya está en USD.
    precio_implementacion_usd: moneda === "USD" ? precioImplementacion : null,
    mantenimiento_mensual: Number.isFinite(mantenimientoMensual) ? mantenimientoMensual : null,
    mantenimiento_moneda: Number.isFinite(mantenimientoMensual) ? moneda : null,
    tiempo_hasta_cobro_dias: Number.isFinite(tiempoHastaCobroDias) ? tiempoHastaCobroDias : null,
    origen_cliente: origenCliente,
    mensaje_usado: null,
    link_caso: linkCaso,
    tags: ["comunidad"],
  };

  try {
    const mainRef = await gh(`/git/ref/heads/main`, token);
    const mainSha = mainRef.object.sha;

    await gh(`/git/refs`, token, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: mainSha }),
    });

    const contenidoB64 = Buffer.from(JSON.stringify(caso, null, 2)).toString("base64");
    await gh(`/contents/${filename}`, token, {
      method: "PUT",
      body: JSON.stringify({
        message: `Aporta caso: ${autor} (${pais}, ${rubro})`,
        content: contenidoB64,
        branch,
      }),
    });

    const avisos: string[] = [];
    if (rubro === "otro" && rubroOtro) {
      avisos.push(`⚠️ Rubro fuera del catálogo cerrado — evaluar si conviene agregar "${rubroOtro}" a rubros.json.`);
    }
    if (queConstruyo === "otro" && queConstruyoOtro) {
      avisos.push(`⚠️ "Qué construyó" fuera del catálogo — evaluar si conviene agregar "${queConstruyoOtro}" a capacidades.json.`);
    }

    const pr = await gh(`/pulls`, token, {
      method: "POST",
      body: JSON.stringify({
        title: rubro === "otro" && rubroOtro
          ? `Nuevo caso: ${autor} — ${rubroOtro} (${pais}) [rubro fuera de catálogo]`
          : `Nuevo caso: ${autor} — ${rubro} (${pais})`,
        head: branch,
        base: "main",
        body: [
          "Caso aportado desde el formulario del Radar Imperial.",
          "",
          `- Rubro: ${rubro}${rubroOtro ? ` (detalle: ${rubroOtro})` : ""}`,
          `- País: ${pais}`,
          `- Qué construyó: ${queConstruyo}${queConstruyoOtro ? ` (detalle: ${queConstruyoOtro})` : ""}`,
          `- Precio: ${precioImplementacion} ${moneda}`,
          ...(avisos.length ? ["", ...avisos] : []),
        ].join("\n"),
      }),
    });

    return new Response(JSON.stringify({ ok: true, prUrl: pr.html_url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ ok: false, error: "No se pudo crear el PR. Intenta de nuevo en unos minutos." }),
      { status: 502 }
    );
  }
};

export const config: Config = {
  path: "/api/aportar-caso",
};
