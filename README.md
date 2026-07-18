# Radar Imperial

MVP del generador de ventas para la comunidad Imperio: radar de nichos por
país + rubro (basado en casos reales) y generador de Mensaje Imperial.

## Estructura

```
rubros.json          catálogo cerrado de rubros (editable por PR)
capacidades.json     catálogo de lo que se puede construir/vender
casos/{PAIS}/*.json  un archivo por venta cerrada — esto es el repo abierto
scripts/build-index.js  junta /casos en public/data/index.json
public/              el sitio estático (esto es lo que se publica)
netlify.toml         build = node scripts/build-index.js, publish = public
```

## Probar en local

No hay dependencias que instalar. Basta con:

```
node scripts/build-index.js
npx serve public
```

(o cualquier servidor estático — `python3 -m http.server` desde `public/`
también sirve).

## Desplegar en Netlify

1. Sube esta carpeta a un repo nuevo en GitHub (público, para que la
   comunidad pueda abrir PRs).
2. En Netlify: **Add new site → Import an existing project** → conecta el
   repo. Netlify va a detectar `netlify.toml` solo (build command y publish
   dir ya están configurados ahí).
3. Deploy. Cada push a `main` reconstruye el sitio automáticamente,
   incluyendo `index.json` a partir de lo que haya en `/casos`.
4. Una vez tengas la URL del repo real, actualiza la constante `REPO_URL`
   al inicio de `public/js/app.js` — hoy apunta a un placeholder.

## Cómo aporta la comunidad

Ver `casos/README.md`. Resumen: copian `casos/_template.json`, lo llenan
con su venta real, y abren un PR. Al mergear, el Radar se actualiza solo.

## Pendiente para v2 (no incluido en este MVP)

- Tracker de accountability por usuario (Día X de 7, mensajes enviados) —
  necesitaría autenticación (Netlify Identity o similar).
- Conversión de moneda automática — hoy el precio en USD lo declara quien
  sube el caso.
- Los 7 casos semilla en `/casos/XX` tienen país y/o rubro sin confirmar
  (viene solo del resumen agregado que compartiste, no del dataset
  completo). Vale la pena pedirle a cada autor que confirme esos datos
  antes de anunciar el radar en la comunidad.
