'use strict';

const DATA_URL = 'localidades.geojson';

const ui = {
  panel: document.getElementById('panel'),
  toggle: document.getElementById('toggle'),
  search: document.getElementById('search'),
  clear: document.getElementById('clear'),
  list: document.getElementById('list'),
  results: document.getElementById('results'),
  count: document.getElementById('count'),
  empty: document.getElementById('empty'),
  reset: document.getElementById('reset'),
};

/* ---------------------------------------------------------------------------
 * Mapa base
 * ------------------------------------------------------------------------- */

const map = L.map('map', {
  zoomControl: false,
  minZoom: 3,
  maxZoom: 18,
  worldCopyJump: true,
}).setView([-38.4, -63.6], 4);

L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

const darkBase = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  className: 'dark-tiles',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
});

const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 18,
    attribution: 'Imágenes &copy; <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a>, Maxar, Earthstar Geographics',
  }
);

darkBase.addTo(map);
L.control.layers({ 'Noche': darkBase, 'Satélite': satellite }, null, {
  position: 'topright',
  collapsed: true,
}).addTo(map);

/* ---------------------------------------------------------------------------
 * Capa de marcadores (con agrupado si el plugin está disponible)
 * ------------------------------------------------------------------------- */

const canCluster = typeof L.markerClusterGroup === 'function';

const markers = canCluster
  ? L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 48,
      iconCreateFunction(cluster) {
        const count = cluster.getChildCount();
        const size = count < 10 ? 34 : count < 50 ? 40 : 46;
        return L.divIcon({
          html: '<span>' + count + '</span>',
          className: 'cluster',
          iconSize: L.point(size, size),
        });
      },
    })
  : L.layerGroup();

markers.addTo(map);

/* ---------------------------------------------------------------------------
 * Utilidades
 * ------------------------------------------------------------------------- */

function normalize(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatCoords(lat, lng) {
  return lat.toFixed(4) + ', ' + lng.toFixed(4);
}

function mapPadding() {
  const desktop = window.matchMedia('(min-width: 900px)').matches;
  const panel = ui.panel.getBoundingClientRect();

  if (desktop) {
    return {
      paddingTopLeft: L.point(Math.min(panel.width + 40, window.innerWidth * 0.5), 24),
      paddingBottomRight: L.point(24, 24),
    };
  }

  const panelHeight = ui.panel.classList.contains('is-collapsed')
    ? panel.height
    : Math.min(panel.height, window.innerHeight * 0.55);

  return {
    paddingTopLeft: L.point(16, 16),
    paddingBottomRight: L.point(16, panelHeight + 20),
  };
}

function fitAllPlaces(animate) {
  if (!places.length) return;
  const bounds = homeBounds();
  const options = Object.assign({ maxZoom: 10 }, mapPadding());
  if (animate) {
    map.flyToBounds(bounds, Object.assign({ duration: 0.9 }, options));
  } else {
    map.fitBounds(bounds, options);
  }
}

/* ---------------------------------------------------------------------------
 * Estado
 * ------------------------------------------------------------------------- */

let places = [];
let activePlace = null;

// Encuadre inicial del país. Si el archivo trae puntos aislados muy lejanos
// (por ejemplo, una localidad cargada con coordenadas de otro continente), el
// encuadre usa el conjunto principal y esos puntos siguen disponibles en el
// mapa y en el buscador.
const HOME_BOUNDS = L.latLngBounds([-55.4, -73.6], [-21.5, -53.4]);

function homeBounds() {
  const inside = places.filter((place) => HOME_BOUNDS.contains([place.lat, place.lng]));
  const source = inside.length >= places.length * 0.8 ? inside : places;
  return L.latLngBounds(source.map((place) => [place.lat, place.lng]));
}

/* ---------------------------------------------------------------------------
 * Popups y filas de la lista
 * ------------------------------------------------------------------------- */

function buildPopup(place) {
  const root = document.createElement('div');
  root.className = 'popup';

  const title = document.createElement('h2');
  title.className = 'popup__title';
  title.textContent = place.name;

  const coords = document.createElement('p');
  coords.className = 'popup__coords';
  coords.textContent = formatCoords(place.lat, place.lng);

  const links = document.createElement('p');
  links.className = 'popup__links';

  const google = document.createElement('a');
  google.href = 'https://www.google.com/maps/search/?api=1&query=' + place.lat + ',' + place.lng;
  google.target = '_blank';
  google.rel = 'noopener';
  google.textContent = 'Google Maps';

  const osmLink = document.createElement('a');
  osmLink.href = 'https://www.openstreetmap.org/?mlat=' + place.lat + '&mlon=' + place.lng +
    '#map=14/' + place.lat + '/' + place.lng;
  osmLink.target = '_blank';
  osmLink.rel = 'noopener';
  osmLink.textContent = 'OpenStreetMap';

  links.append(google, document.createTextNode(' · '), osmLink);
  root.append(title, coords, links);
  return root;
}

function createRow(place) {
  const item = document.createElement('li');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'place';
  button.title = place.name;

  const dot = document.createElement('span');
  dot.className = 'place__dot';
  dot.setAttribute('aria-hidden', 'true');

  const body = document.createElement('span');
  body.className = 'place__body';

  const name = document.createElement('span');
  name.className = 'place__name';
  name.textContent = place.name;

  const coords = document.createElement('span');
  coords.className = 'place__coords';
  coords.textContent = formatCoords(place.lat, place.lng);

  body.append(name, coords);
  button.append(dot, body);

  button.addEventListener('click', () => {
    setActive(place);
    focusPlace(place);
  });

  button.addEventListener('mouseenter', () => highlight(place, true));
  button.addEventListener('mouseleave', () => highlight(place, false));
  button.addEventListener('focus', () => highlight(place, true));
  button.addEventListener('blur', () => highlight(place, false));

  item.appendChild(button);
  place.row = item;
  place.button = button;
  return item;
}

/* ---------------------------------------------------------------------------
 * Interacciones
 * ------------------------------------------------------------------------- */

function highlight(place, on) {
  place.button.classList.toggle('is-hover', on);
  if (!place.onMap) return;
  place.marker.setStyle({ weight: on ? 3 : 1.5 });
  place.marker.setRadius(on ? 9 : 6);
}

function setActive(place) {
  if (activePlace && activePlace !== place) {
    activePlace.button.classList.remove('is-active');
  }
  activePlace = place;
  place.button.classList.add('is-active');
  place.row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function focusPlace(place) {
  if (typeof markers.zoomToShowLayer === 'function') {
    markers.zoomToShowLayer(place.marker, () => {
      map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 12), { duration: 0.7 });
      place.marker.openPopup();
    });
  } else {
    map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 12), { duration: 0.7 });
    place.marker.openPopup();
  }
}

function applyFilter(query) {
  const needle = normalize(query);
  let visible = 0;

  for (const place of places) {
    const matches = needle === '' || place.key.includes(needle);
    place.row.hidden = !matches;

    if (matches) {
      if (!place.onMap) {
        markers.addLayer(place.marker);
        place.onMap = true;
      }
      visible += 1;
    } else if (place.onMap) {
      markers.removeLayer(place.marker);
      place.onMap = false;
      if (activePlace === place) {
        place.button.classList.remove('is-active');
        activePlace = null;
      }
    }
  }

  ui.count.textContent = needle === ''
    ? places.length + ' localidades'
    : visible + ' de ' + places.length + ' localidades';

  ui.empty.hidden = visible !== 0;
  ui.clear.hidden = needle === '';
}

function clearFilter() {
  ui.search.value = '';
  applyFilter('');
}

// Mantiene los controles de Leaflet por encima de la hoja inferior en celulares.
function updateSheetOffset() {
  document.documentElement.style.setProperty('--sheet-offset', ui.panel.offsetHeight + 16 + 'px');
}

if ('ResizeObserver' in window) {
  new ResizeObserver(updateSheetOffset).observe(ui.panel);
}
window.addEventListener('resize', updateSheetOffset);
updateSheetOffset();

/* ---------------------------------------------------------------------------
 * Carga de datos
 * ------------------------------------------------------------------------- */

function showError(message) {
  ui.count.textContent = 'No se pudieron cargar los datos';
  ui.empty.hidden = false;
  ui.empty.textContent = message;
  ui.list.hidden = true;
}

function init(data) {
  const features = Array.isArray(data.features) ? data.features : [];

  const points = features.filter((feature) => {
    return feature &&
      feature.geometry &&
      feature.geometry.type === 'Point' &&
      Array.isArray(feature.geometry.coordinates) &&
      feature.geometry.coordinates.length >= 2;
  });

  if (!points.length) {
    showError('El archivo localidades.geojson no contiene puntos para mostrar.');
    return;
  }

  const fragment = document.createDocumentFragment();

  places = points
    .map((feature) => {
      const lng = Number(feature.geometry.coordinates[0]);
      const lat = Number(feature.geometry.coordinates[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const name = String(
        (feature.properties && (feature.properties.Lugar || feature.properties.Nombre || feature.properties.name)) ||
        'Localidad sin nombre'
      ).trim();

      return { name, lat, lng, key: normalize(name), onMap: false };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  for (const place of places) {
    place.marker = L.circleMarker([place.lat, place.lng], {
      className: 'dot',
      radius: 6,
      color: '#ffc7b8',
      weight: 1.5,
      fillColor: '#ff4d2e',
      fillOpacity: 0.95,
    });

    place.marker.bindPopup(buildPopup(place), {
      closeButton: true,
      maxWidth: 300,
      autoPanPadding: [24, 24],
    });

    place.marker.on('click', () => setActive(place));
    place.marker.on('mouseover', () => highlight(place, true));
    place.marker.on('mouseout', () => highlight(place, false));

    markers.addLayer(place.marker);
    place.onMap = true;

    fragment.appendChild(createRow(place));
  }

  ui.list.appendChild(fragment);
  ui.count.textContent = places.length + ' localidades';
  fitAllPlaces(false);
}

/* ---------------------------------------------------------------------------
 * Eventos de la interfaz
 * ------------------------------------------------------------------------- */

ui.search.addEventListener('input', (event) => applyFilter(event.target.value));

ui.search.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    const first = places.find((place) => !place.row.hidden);
    if (first) {
      setActive(first);
      focusPlace(first);
    }
  } else if (event.key === 'Escape') {
    clearFilter();
  }
});

ui.clear.addEventListener('click', () => {
  clearFilter();
  ui.search.focus();
});

ui.reset.addEventListener('click', () => {
  clearFilter();
  fitAllPlaces(true);
});

ui.toggle.addEventListener('click', () => {
  const collapsed = ui.panel.classList.toggle('is-collapsed');
  ui.toggle.setAttribute('aria-expanded', String(!collapsed));
  ui.toggle.setAttribute('aria-label', collapsed ? 'Mostrar la lista de localidades' : 'Ocultar la lista de localidades');
});

/* ---------------------------------------------------------------------------
 * Arranque
 * ------------------------------------------------------------------------- */

if (location.protocol === 'file:') {
  showError('Abrí el sitio desde un servidor local (por ejemplo: python3 -m http.server) o publicalo en GitHub Pages.');
} else {
  fetch(DATA_URL)
    .then((response) => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(init)
    .catch(() => {
      showError('No se pudo leer localidades.geojson. Verificá que el archivo esté junto a index.html.');
    });
}
