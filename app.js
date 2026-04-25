import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let layerDark, layerSatellite, layerControl;

// --- GESTIÓN DE MAPA ---
function initMap() {
    if (map) return;

    // 1. Definir Capas
    layerDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
    });

    layerSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri, DigitalGlobe, GeoEye, Earthstar Geographics'
    });

    // 2. Crear Mapa (Inicia en Satelital si prefieres)
    map = L.map('map', {
        center: [-33.1467, -70.2857],
        zoom: 14,
        layers: [layerDark] // Capa inicial
    });

    // 3. Control de Capas (Botón arriba a la derecha)
    const baseMaps = {
        "Mapa Oscuro": layerDark,
        "Vista Satelital": layerSatellite
    };
    L.control.layers(baseMaps).addTo(map);
}

// --- CAMBIO DE MODO CLARO / OSCURO ---
window.toggleTheme = () => {
    const body = document.body;
    const btn = document.getElementById('theme-toggle');
    
    if (body.classList.contains('dark-mode')) {
        body.classList.replace('dark-mode', 'light-mode');
        btn.innerText = "Modo Oscuro";
        // Si quieres que el mapa también cambie al modo claro de calles:
        map.removeLayer(layerDark);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    } else {
        body.classList.replace('light-mode', 'dark-mode');
        btn.innerText = "Modo Claro";
        initMap(); // Recarga la configuración oscura
    }
};

// --- RESTO DE LÓGICA (LOGIN Y VEHÍCULOS) ---
window.login = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Error: " + err.message));
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('user-display').innerText = `${data.nombre}`;
            if (data.rol === 'admin' || data.rol === 'operador') {
                document.getElementById('controles-operador').style.display = 'block';
            }
            initMap();
            escucharVehiculos();
        }
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
});

function escucharVehiculos() {
    onSnapshot(collection(db, "material_mayor"), (snapshot) => {
        const lista = document.getElementById('lista-vehiculos');
        lista.innerHTML = '';
        snapshot.forEach((doc) => {
            const v = doc.data();
            const id = doc.id;
            if (v.ubicacion) {
                const lat = v.ubicacion.latitude;
                const lng = v.ubicacion.longitude;
                if (markers[id]) {
                    markers[id].setLatLng([lat, lng]);
                } else {
                    markers[id] = L.marker([lat, lng]).addTo(map).bindPopup(`<b>${id}</b>`);
                }
                const claseEstado = `estado-${v.estado.replace('-', '')}`;
                lista.innerHTML += `
                    <div class="vehiculo-card ${claseEstado}">
                        <div><strong>${id}</strong><br><small>${v.tipo}</small></div>
                        <strong>${v.estado}</strong>
                    </div>`;
            }
        });
    });
}
