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
let layerDark, layerLight, layerSatellite;

// --- INICIALIZAR MAPA CON 3 VISTAS ---
function initMap() {
    if (map) return;

    layerDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap' });
    layerLight = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' });
    layerSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri, DigitalGlobe, GeoEye, Earthstar Geographics'
    });

    map = L.map('map', {
        center: [-33.1467, -70.2857],
        zoom: 14,
        layers: [layerDark] 
    });

    const baseMaps = {
        "Vista Oscura": layerDark,
        "Vista Clara": layerLight,
        "Vista Satelital": layerSatellite
    };

    L.control.layers(baseMaps).addTo(map);
}

// --- CAMBIO DE TEMA INTERFAZ ---
window.toggleTheme = () => {
    const body = document.body;
    const btn = document.getElementById('theme-toggle');
    body.classList.toggle('light-mode');
    if (btn) btn.innerText = body.classList.contains('light-mode') ? "Modo Oscuro" : "Modo Claro";
};

// --- AUTENTICACIÓN ---
window.login = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Error: " + err.message));
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    const userDisplay = document.getElementById('user-display');

    if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if(loginScreen) loginScreen.style.display = 'none';
            if(mainApp) mainApp.style.display = 'block';
            if(userDisplay) userDisplay.innerText = data.nombre || "Usuario";

            if (data.rol === 'admin' || data.rol === 'operador') {
                const ctrl = document.getElementById('controles-operador');
                if(ctrl) ctrl.style.display = 'block';
            }
            initMap();
            escucharVehiculos();
        }
    } else {
        if(loginScreen) loginScreen.style.display = 'flex';
        if(mainApp) mainApp.style.display = 'none';
    }
});

// --- RASTREO REAL-TIME ---
function escucharVehiculos() {
    onSnapshot(collection(db, "material_mayor"), (snapshot) => {
        const lista = document.getElementById('lista-vehiculos');
        if(lista) lista.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const v = doc.data();
            const id = doc.id;
            
            if (v.ubicacion && v.estado) {
                const lat = v.ubicacion.latitude;
                const lng = v.ubicacion.longitude;

                if (markers[id]) {
                    markers[id].setLatLng([lat, lng]);
                } else {
                    markers[id] = L.marker([lat, lng]).addTo(map).bindPopup(`<b>${id}</b><br>${v.tipo}`);
                }

                const claseEstado = `estado-${v.estado.replace('-', '')}`;
                if(lista) {
                    lista.innerHTML += `
                        <div class="vehiculo-card ${claseEstado}">
                            <div><strong>${id}</strong><br><small>${v.tipo || 'Unidad'}</small></div>
                            <strong>${v.estado}</strong>
                        </div>`;
                }
            }
        });
    });
}
