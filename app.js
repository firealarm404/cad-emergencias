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

let map, markers = {};
let puntoEmergencia = null, tempMarker = null;

// Funciones globales vinculadas a window para que el HTML las vea
window.login = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(e => alert("Error de acceso"));
};

window.logout = () => signOut(auth);

window.abrirModalEmergencia = () => {
    document.getElementById('modal-emergencia').style.display = 'flex';
    if (tempMarker) map.removeLayer(tempMarker);
    document.getElementById('em-direccion').value = '';
};

window.cerrarModalEmergencia = () => {
    document.getElementById('modal-emergencia').style.display = 'none';
};

window.crearEmergencia = () => {
    const tipo = document.getElementById('em-tipo').value;
    if (!puntoEmergencia) return alert("Por favor, haz clic en el mapa para marcar la ubicación.");
    alert(`Despacho Generado: ${tipo}`);
    window.cerrarModalEmergencia();
};

function initMap() {
    if (map) return;

    // 1. EL MAPA DE TU IMAGEN (CartoDB Positron)
    const vistaActual = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CartoDB'
    });

    // 2. VISTA CALLE (OpenStreetMap)
    const vistaCalle = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

    // 3. VISTA SATELITAL (Esri)
    const vistaSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');

    map = L.map('map', {
        center: [-33.19, -70.45],
        zoom: 11,
        layers: [vistaActual] 
    });

    L.control.layers({
        "Vista Actual (Gris)": vistaActual,
        "Mapa de Calles": vistaCalle,
        "Satélite": vistaSat
    }).addTo(map);

    map.on('click', (e) => {
        if (document.getElementById('modal-emergencia').style.display === 'flex') {
            puntoEmergencia = e.latlng;
            document.getElementById('em-direccion').value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
            if (tempMarker) map.removeLayer(tempMarker);
            tempMarker = L.marker(e.latlng).addTo(map);
        }
    });
}

function escucharVehiculos() {
    onSnapshot(collection(db, "material_mayor"), (snap) => {
        const lista = document.getElementById('lista-vehiculos');
        lista.innerHTML = '';
        snap.forEach(d => {
            const v = d.data(), id = d.id;
            const pos = [v.ubicacion.latitude, v.ubicacion.longitude];
            
            // Color de marcador (Simulando tu imagen)
            let color = v.estado?.startsWith('6-3') ? '#ff0000' : v.estado?.startsWith('6-8') ? '#2ecc71' : '#f39c12';
            
            const icon = L.divIcon({
                className: 'custom-icon',
                html: `<div style="background:${color}" class="map-label"><span>${id}</span></div>`,
                iconSize: [40, 25]
            });

            if (markers[id]) markers[id].setLatLng(pos).setIcon(icon);
            else markers[id] = L.marker(pos, {icon}).addTo(map);

            lista.innerHTML += `<div class="vehiculo-card"><strong>${id}</strong> - ${v.estado || '6-10'}</div>`;
        });
    });
}

onAuthStateChanged(auth, (u) => {
    if (u) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        initMap();
        escucharVehiculos();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
});
