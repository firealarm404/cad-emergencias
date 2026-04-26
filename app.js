import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let unidadSeleccionada = null;

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

const listaClaves = [
    { cod: "6-3", desc: "En el lugar" },
    { cod: "6-7", desc: "Situación controlada" },
    { cod: "6-8", desc: "Disponible" },
    { cod: "6-9", desc: "Se retira del lugar" },
    { cod: "6-10", desc: "En Base" },
    { cod: "6-11", desc: "En panne" },
    { cod: "6-12", desc: "Sufre colisión" },
    { cod: "6-13", desc: "Otros Tramites" },
    { cod: "6-14", desc: "Carga Combustible" },
    { cod: "6-15", desc: "Se dirige a Centro Asistencial" },
    { cod: "6-18", desc: "Entra a tunel" },
    { cod: "6-19", desc: "Sale del tunel" }
];

function initMap() {
    if (map) return;
    const layerLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
    const layerDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
    const layerSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    map = L.map('map', { center: [-33.19, -70.45], zoom: 11, layers: [layerLight] });
    L.control.layers({ "Mapa Gris Pro": layerLight, "Mapa Oscuro": layerDark, "Satelital": layerSat }).addTo(map);
}

// --- LÓGICA DE MODAL Y CLAVES ---
window.abrirMenuClaves = (id) => {
    unidadSeleccionada = id;
    mostrarClavesPrincipales();
    document.getElementById('modal-titulo').innerText = `${nombresBrigadas[id] || id}`;
    document.getElementById('modal-claves').style.display = 'flex';
};

function mostrarClavesPrincipales() {
    document.getElementById('view-claves').style.display = 'grid';
    document.getElementById('view-bases').style.display = 'none';
    const container = document.getElementById('view-claves');
    container.innerHTML = '';
    listaClaves.forEach(clave => {
        const btn = document.createElement('button');
        btn.className = 'btn-clave';
        btn.innerHTML = `<strong>${clave.cod}</strong> ${clave.desc}`;
        btn.onclick = () => {
            if (clave.cod === "6-10") mostrarSeleccionBase();
            else actualizarEstado(clave.cod);
        };
        container.appendChild(btn);
    });
}

function mostrarSeleccionBase() {
    document.getElementById('view-claves').style.display = 'none';
    document.getElementById('view-bases').style.display = 'block';
    const container = document.getElementById('bases-container');
    container.innerHTML = '';
    // Usamos las claves del diccionario como opciones de base
    Object.keys(nombresBrigadas).forEach(idBase => {
        const btn = document.createElement('button');
        btn.className = 'btn-clave';
        btn.innerHTML = nombresBrigadas[idBase];
        btn.onclick = () => actualizarEstado(`6-10 (${idBase})`);
        container.appendChild(btn);
    });
}

window.cerrarModal = () => document.getElementById('modal-claves').style.display = 'none';

async function actualizarEstado(nuevaClave) {
    try {
        await updateDoc(doc(db, "material_mayor", unidadSeleccionada), { estado: nuevaClave });
        cerrarModal();
    } catch (e) { console.error(e); }
}

// --- FIREBASE ---
window.login = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, pass);
};
window.logout = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('user-display').innerText = userDoc.data().nombre;
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
        snapshot.forEach((docSnap) => {
            const v = docSnap.data();
            const id = docSnap.id;
            const nombreReal = nombresBrigadas[id] || id;

            if (v.ubicacion) {
                const lat = v.ubicacion.latitude;
                const lng = v.ubicacion.longitude;
                const estado = v.estado || "6-8";
                
                const customIcon = L.divIcon({
                    className: `custom-marker ${estado === '6-3' ? 'marker-rojo' : (estado.includes('6-10') ? 'marker-azul' : '')}`,
                    html: `<span>${id}</span>`,
                    iconSize: [45, 22]
                });

                if (markers[id]) markers[id].setLatLng([lat, lng]).setIcon(customIcon);
                else markers[id] = L.marker([lat, lng], { icon: customIcon }).addTo(map).bindPopup(nombreReal);

                const claseEstado = `estado-${estado.split(' ')[0].replace('-', '')}`;
                lista.innerHTML += `
                    <div class="vehiculo-card ${claseEstado}" onclick="abrirMenuClaves('${id}')">
                        <div><strong>${nombreReal}</strong><br><small>${id}</small></div>
                        <strong>${estado}</strong>
                    </div>`;
            }
        });
    });
}

window.toggleTheme = () => {
    document.body.classList.toggle('light-mode');
    document.getElementById('theme-toggle').innerText = document.body.classList.contains('light-mode') ? "Modo Oscuro" : "Modo Claro";
};
