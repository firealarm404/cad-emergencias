import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWixMbVJrcIgK5eIkHcnx91dCdUZVWEJY",
  authDomain: "cad-emergencias-24da0.firebaseapp.com",
  projectId: "cad-emergencias-24da0",
  storageBucket: "cad-emergencias-24da0.firebasestorage.app",
  messagingSenderId: "799146039442",
  appId: "1:799146039442:web:660447d59af47a94e96e4b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let map, markers = {}, basesCache = {};
let unidadSeleccionada = null, puntoEmergencia = null, tempMarker = null;

async function cargarBases() {
    const snap = await getDocs(collection(db, "bases"));
    snap.forEach(d => { basesCache[d.id] = d.data(); });
}

function initMap() {
    if (map) return;

    // 1. VISTA ACTUAL (CartoDB Voyager - Mapa claro y profesional)
    const vistaActual = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB'
    });

    // 2. VISTA CALLE (OpenStreetMap Standard)
    const vistaCalle = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    });

    // 3. VISTA SATELITAL (Esri World Imagery)
    const vistaSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
    });

    map = L.map('map', {
        center: [-33.19, -70.45],
        zoom: 11,
        layers: [vistaActual] // Se inicia con CartoDB Voyager
    });

    // CONTROL DE CAPAS (Selector arriba a la derecha)
    const baseLayers = {
        "Vista Actual": vistaActual,
        "Mapa de Calles": vistaCalle,
        "Vista Satelital": vistaSat
    };
    L.control.layers(baseLayers).addTo(map);

    // Evento para capturar coordenadas al hacer clic (cuando el modal está abierto)
    map.on('click', (e) => {
        const modal = document.getElementById('modal-emergencia');
        if (modal && modal.style.display === 'flex') {
            puntoEmergencia = e.latlng;
            document.getElementById('em-direccion').value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
            
            if (tempMarker) map.removeLayer(tempMarker);
            tempMarker = L.marker(e.latlng).addTo(map).bindPopup("Ubicación marcada").openPopup();
        }
    });
}

window.buscarDireccion = async () => {
    const query = document.getElementById('em-direccion').value;
    if (query.length < 3) return;
    try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const data = await resp.json();
        if (data.length > 0) {
            const pos = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            puntoEmergencia = { lat: pos[0], lng: pos[1] };
            map.setView(pos, 16);
            if (tempMarker) map.removeLayer(tempMarker);
            tempMarker = L.marker(pos).addTo(map).bindPopup("Dirección Encontrada").openPopup();
        }
    } catch (e) { console.error(e); }
};

function escucharVehiculos() {
    onSnapshot(collection(db, "material_mayor"), (snap) => {
        const lista = document.getElementById('lista-vehiculos');
        lista.innerHTML = '';
        snap.forEach(d => {
            const v = d.data(), id = d.id, est = v.estado || "6-10";
            let lat = v.ubicacion.latitude, lng = v.ubicacion.longitude;

            // Lógica de base si está 6-10
            if (est.startsWith('6-10') && est.includes('(')) {
                const idBase = est.match(/\(([^)]+)\)/)?.[1];
                if (idBase && basesCache[idBase]) {
                    lat = basesCache[idBase].ubicacion.latitude;
                    lng = basesCache[idBase].ubicacion.longitude;
                }
            }

            let colorCls = est.startsWith('6-3') ? 'marker-rojo' : est.startsWith('6-8') ? 'marker-verde' : 'marker-azul';
            const icon = L.divIcon({ className: `custom-marker ${colorCls}`, html: `<span>${id}</span>`, iconSize: [45, 22] });
            
            if (markers[id]) markers[id].setLatLng([lat, lng]).setIcon(icon);
            else markers[id] = L.marker([lat, lng], {icon}).addTo(map);

            lista.innerHTML += `<div class="vehiculo-card" onclick="abrirMenuClaves('${id}')"><strong>${id}</strong> - ${est}</div>`;
        });
    });
}

// Funciones globales para botones HTML
window.login = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(e => alert("Error: " + e.message));
};

window.logout = () => signOut(auth);

window.abrirModalEmergencia = () => {
    document.getElementById('modal-emergencia').style.display = 'flex';
    puntoEmergencia = null;
    document.getElementById('em-direccion').value = '';
};

window.cerrarModalEmergencia = () => {
    document.getElementById('modal-emergencia').style.display = 'none';
    if (tempMarker) map.removeLayer(tempMarker);
};

window.crearEmergencia = () => {
    const tipo = document.getElementById('em-tipo').value;
    const lugar = document.getElementById('em-direccion').value;
    if (!lugar) return alert("Selecciona una ubicación en el mapa");
    console.log("Emergencia generada:", tipo, lugar);
    cerrarModalEmergencia();
};

onAuthStateChanged(auth, async (u) => {
    if (u) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        await cargarBases();
        initMap();
        escucharVehiculos();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
});
