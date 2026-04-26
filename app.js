import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIGURACIÓN DE TU PROYECTO
const firebaseConfig = {
  apiKey: "AIzaSyBWixMbVJrcIgK5eIkHcnx91dCdUZVWEJY",
  authDomain: "cad-emergencias-24da0.firebaseapp.com",
  projectId: "cad-emergencias-24da0",
  storageBucket: "cad-emergencias-24da0.firebasestorage.app",
  messagingSenderId: "799146039442",
  appId: "1:799146039442:web:660447d59af47a94e96e4b"
};

// 2. INICIALIZACIÓN
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let map, markers = {};
let layerDark, layerLight, layerSatellite;

// 3. DICCIONARIO DE BRIGADAS (Nombres Reales)
const nombresBrigadas = {
    "B1": "Brigada Bronces",
    "UIR-M": "Brigada Mina",
    "S3": "SPA 220",
    "S1": "Policlínico Pérez Caldera",
    "UIR-E": "Brigada Ermita",
    "S2": "Policlínico Las Tórtolas",
    "B2": "Brigada Tórtolas",
    "UIR-S": "Brigada STP"
};

// 4. GESTIÓN DEL MAPA
function initMap() {
    if (map) return;

    // Capa Gris Profesional (CartoDB Positron)
    layerLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
    });

    // Capa Oscura
    layerDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
    });

    // Capa Satelital
    layerSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri'
    });

    // Centrado inicial (Zona Central de tus bases)
    map = L.map('map', {
        center: [-33.19, -70.45],
        zoom: 11,
        layers: [layerLight] // Inicia con el mapa gris bonito
    });

    // Selector de capas arriba a la derecha
    const baseMaps = {
        "Mapa Gris Pro": layerLight,
        "Mapa Oscuro": layerDark,
        "Vista Satelital": layerSatellite
    };
    L.control.layers(baseMaps).addTo(map);
}

// 5. CAMBIO DE TEMA (INTERFAZ)
window.toggleTheme = () => {
    const body = document.body;
    const btn = document.getElementById('theme-toggle');
    body.classList.toggle('light-mode');
    if (btn) btn.innerText = body.classList.contains('light-mode') ? "Modo Oscuro" : "Modo Claro";
};

// 6. AUTENTICACIÓN
window.login = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    if(!email || !pass) return alert("Ingrese credenciales");
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

            initMap();
            escucharVehiculos();
        }
    } else {
        if(loginScreen) loginScreen.style.display = 'flex';
        if(mainApp) mainApp.style.display = 'none';
    }
});

// 7. RASTREO DE VEHÍCULOS EN TIEMPO REAL
function escucharVehiculos() {
    onSnapshot(collection(db, "material_mayor"), (snapshot) => {
        const lista = document.getElementById('lista-vehiculos');
        if(lista) lista.innerHTML = '';
        
        snapshot.forEach((docSnap) => {
            const v = docSnap.data();
            const id = docSnap.id; // Ej: B1, UIR-M, S3...
            const nombreReal = nombresBrigadas[id] || id;

            if (v.ubicacion) {
                const lat = v.ubicacion.latitude;
                const lng = v.ubicacion.longitude;

                // Estilo de marcador "Pastilla"
                const customIcon = L.divIcon({
                    className: `custom-marker ${v.estado === '6-3' ? 'marker-rojo' : ''}`,
                    html: `<span>${id}</span>`,
                    iconSize: [45, 22]
                });

                if (markers[id]) {
                    markers[id].setLatLng([lat, lng]);
                    markers[id].setIcon(customIcon);
                } else {
                    markers[id] = L.marker([lat, lng], { icon: customIcon }).addTo(map)
                        .bindPopup(`<b>${nombreReal}</b><br>ID: ${id}`);
                }

                // Actualizar Lista Lateral con colores de estado
                const estadoLimpio = (v.estado || "6-8").replace('-', '');
                const claseEstado = `estado-${estadoLimpio}`;
                
                if(lista) {
                    lista.innerHTML += `
                        <div class="vehiculo-card ${claseEstado}">
                            <div><strong>${nombreReal}</strong><br><small>${id}</small></div>
                            <strong>${v.estado || "6-8"}</strong>
                        </div>`;
                }
            }
        });
    });
}
