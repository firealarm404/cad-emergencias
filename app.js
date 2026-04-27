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
let unidadSeleccionada = null;
let basesCache = {}; 

// 1. CARGAMOS TODAS LAS BASES EN MEMORIA
async function cargarBases() {
    const snap = await getDocs(collection(db, "bases"));
    snap.forEach(d => {
        basesCache[d.id] = d.data();
    });
}

function initMap() {
    if (map) return;
    map = L.map('map').setView([-33.19, -70.45], 11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
}

// 2. MODAL DE CLAVES
window.abrirMenuClaves = (id) => {
    unidadSeleccionada = id;
    mostrarClavesPrincipales();
    document.getElementById('modal-titulo').innerText = `Unidad: ${id}`;
    document.getElementById('modal-claves').style.display = 'flex';
};

window.mostrarClavesPrincipales = () => {
    document.getElementById('view-claves').style.display = 'grid';
    document.getElementById('view-bases').style.display = 'none';
    const container = document.getElementById('view-claves');
    container.innerHTML = '';
    
    const listaClaves = [
        { cod: "6-3", desc: "En el lugar" }, { cod: "6-8", desc: "Disponible (Base Origen)" },
        { cod: "6-10", desc: "En Base (Cobertura)" }, { cod: "6-11", desc: "En panne" },
        { cod: "6-14", desc: "Carga Combustible" }, { cod: "6-15", desc: "Centro Asistencial" }
    ];

    listaClaves.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'btn-clave';
        btn.innerHTML = `<strong>${c.cod}</strong> ${c.desc}`;
        btn.onclick = () => c.cod === "6-10" ? mostrarSeleccionBase() : actualizarEstado(c.cod);
        container.appendChild(btn);
    });
};

function mostrarSeleccionBase() {
    document.getElementById('view-claves').style.display = 'none';
    document.getElementById('view-bases').style.display = 'block';
    const container = document.getElementById('bases-container');
    container.innerHTML = '';
    Object.keys(basesCache).forEach(idBase => {
        const btn = document.createElement('button');
        btn.className = 'btn-clave';
        btn.innerText = basesCache[idBase].nombre;
        btn.onclick = () => actualizarEstado(`6-10 (${idBase})`);
        container.appendChild(btn);
    });
}

async function actualizarEstado(val) {
    try {
        await updateDoc(doc(db, "material_mayor", unidadSeleccionada), { estado: val });
        window.cerrarModal();
    } catch (e) { console.error(e); }
}

window.cerrarModal = () => document.getElementById('modal-claves').style.display = 'none';

// 3. ESCUCHA DE CAMBIOS (SIN GPS)
function escucharVehiculos() {
    onSnapshot(collection(db, "material_mayor"), (snap) => {
        const lista = document.getElementById('lista-vehiculos');
        lista.innerHTML = '';
        snap.forEach(d => {
            const v = d.data();
            const id = d.id;
            const est = v.estado || "6-8";
            
            // LÓGICA DE UBICACIÓN PREDETERMINADA
            let lat, lng;

            // Caso A: Si es 6-10 (Cobertura en alguna base)
            if (est.includes('6-10')) {
                const match = est.match(/\(([^)]+)\)/);
                const idBase = match ? match[1] : null;
                if (idBase && basesCache[idBase]) {
                    lat = basesCache[idBase].ubicacion.latitude;
                    lng = basesCache[idBase].ubicacion.longitude;
                }
            } 
            
            // Caso B: Si no hay base de cobertura, usa su base original (del documento material_mayor)
            if (!lat || !lng) {
                lat = v.ubicacion.latitude;
                lng = v.ubicacion.longitude;
            }

            const iconCls = `custom-marker ${est === '6-3' ? 'marker-rojo' : (est.includes('6-10') ? 'marker-azul' : '')}`;
            const icon = L.divIcon({ className: iconCls, html: `<span>${id}</span>`, iconSize:[45,22] });
            
            if (markers[id]) {
                markers[id].setLatLng([lat, lng]).setIcon(icon);
            } else {
                markers[id] = L.marker([lat, lng], {icon}).addTo(map);
            }

            const claseEstado = `estado-${est.split(' ')[0].replace('-','')}`;
            lista.innerHTML += `
                <div class="vehiculo-card ${claseEstado}" onclick="abrirMenuClaves('${id}')">
                    <div><strong>${id}</strong><br><small>${v.tipo || 'Unidad'}</small></div>
                    <div style="text-align:right"><strong>${est}</strong></div>
                </div>`;
        });
    });
}

// Inicialización de Auth y App
onAuthStateChanged(auth, async (u) => {
    if (u) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        await cargarBases();
        initMap();
        escucharVehiculos();
    }
});

window.login = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p);
};
window.logout = () => signOut(auth);
window.toggleTheme = () => {
    document.body.classList.toggle('light-mode');
};
