# Mapa Inka 🎧🗺️

**El mapa de la comunidad que escucha el streaming en vivo.**

Cada punto del mapa representa una localidad desde donde alguien sigue el vivo. Buscá tu
ciudad, mirá dónde está el resto de la comunidad y sumate a la transmisión.

- 🌐 **Ver el mapa:** <https://andonizubimendi.github.io/mapa-inka/>
- ▶️ **Escuchar el streaming:** <https://www.youtube.com/live/CtAJIkQDiyQ>

## Qué es esto

Un sitio estático (HTML, CSS y JavaScript, sin build) que dibuja sobre un mapa las
localidades del archivo [`localidades.geojson`](localidades.geojson). El mapa tiene un
look oscuro inspirado en las plataformas de streaming, con el botón **En vivo** siempre a
mano para saltar a YouTube.

### Funcionalidades

- Mapa oscuro con capa satelital opcional.
- Agrupado de marcadores (clustering) para ver todo el país sin superposición.
- Buscador tolerante a mayúsculas y acentos.
- Listado sincronizado con el mapa: al tocar una localidad, el mapa vuela hasta el punto y
  muestra un popup con enlaces a Google Maps y OpenStreetMap.
- Botón **En vivo** y tarjeta **Escuchá el streaming** que llevan directo al vivo.
- Diseño adaptativo: panel lateral en escritorio y hoja inferior plegable en celulares.

## Sumar tu localidad

Los datos viven en `localidades.geojson` como una colección de puntos con una propiedad
`Lugar`:

```json
{
  "type": "Feature",
  "properties": { "Lugar": "Mi Ciudad" },
  "geometry": {
    "type": "Point",
    "coordinates": [-58.3816, -34.6037]
  }
}
```

Las coordenadas van en orden **longitud, latitud**. Para agregar o corregir una localidad,
editá el archivo, hacé un pull request y el sitio se vuelve a publicar solo.

## Ver el sitio localmente

El navegador bloquea `fetch()` al abrir el archivo con `file://`, así que conviene levantar
un servidor local:

```bash
python3 -m http.server 8000
```

Luego abrir <http://localhost:8000>.

## Publicación

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publica el sitio
en GitHub Pages con cada push a `main`. La página queda en:

**<https://andonizubimendi.github.io/mapa-inka/>**

Si necesitás reactivarlo: **Settings → Pages → Build and deployment → Source: GitHub
Actions**, y luego ejecutá **Actions → Publicar en GitHub Pages → Run workflow**.

## Estructura

```
index.html                     Página del mapa
styles.css                     Estilos y diseño adaptativo
app.js                         Carga del GeoJSON y lógica del mapa
localidades.geojson            Localidades de la comunidad
.github/workflows/deploy.yml   Publicación automática en GitHub Pages
```

## Créditos

- [Leaflet](https://leafletjs.com/) para el mapa interactivo.
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) para el agrupado.
- Mapa base de [OpenStreetMap](https://www.openstreetmap.org/copyright), con un filtro CSS
  para el modo oscuro.
- Imágenes satelitales de [Esri](https://www.esri.com/).
- Tipografía [Inter](https://rsms.me/inter/).
