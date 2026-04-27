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
window.unidadSeleccionada = null;
let basesCache = {}; 

const listaClaves = [
    { cod: "6-3", desc: "En el lugar" }, 
    { cod: "6-7", desc: "Situación controlada" },
    { cod: "6-8", desc: "Disponible" },
    { cod: "6-9", desc: "Se retira del lugar" }, 
    { cod: "6-10", desc: "En Base (Origen/Cobertura)" },
    { cod: "6-11", desc: "En panne" }, 
    { cod: "6-12", desc: "Sufre colisión" },
    { cod: "6-13", desc: "Otros Trámites" }, 
    { cod: "6-14", desc: "Carga Combustible" },
    { cod: "6-15", desc: "Centro Asistencial" }, 
    { cod: "6-18", desc: "Entra a túnel" },
    { cod: "6-19", desc: "Sale del túnel" }
];

// --- FUNCIONES GLOBALES (ACCESIBLES DESDE EL HTML) ---

window.login = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p).catch(() => alert("Acceso Denegado"));
};

window.logout = () => signOut(auth);

window.toggleTheme = () => document.body.classList.toggle('light-mode');

window.abrirModalEmergencia = () => {
    document.getElementById('modal-emergencia').style.display = 'flex';
};

window.cerrarModalEmergencia = () => {
    document.getElementById('modal-emergencia').style.display = 'none';
};

window.abrirMenuClaves = (id) => {
    window.unidadSeleccionada = id;
    window.mostrarClavesPrincipales();
    document.getElementById('modal-titulo').innerText = `Unidad: ${id}`;
    document.getElementById('modal-claves').style.display = 'flex';
};

window.cerrarModal = () => { 
    document.getElementById('modal-claves').style.display = 'none'; 
};

window.mostrarClavesPrincipales = () => {
    document.getElementById('view-claves').style.display = 'grid';
    document.getElementById('view-bases').style.display = 'none';
    document.getElementById('view-tramite').style.display = 'none';
    const container = document.getElementById('view-claves');
    container.innerHTML = '';
    
    listaClaves.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'btn-clave';
        btn.innerHTML = `<strong>${c.cod}</strong> ${c.desc}`;
        btn.onclick = () => {
            if (c.cod === "6-10") mostrarSeleccionBase();
            else if (c.cod === "6-13") mostrarInputTramite();
            else actualizarEstado(c.cod);
        };
        container.appendChild(btn);
    });
};

window.guardarTramite = () => {
    const desc = document.getElementById('input-613').value;
    if (desc) actualizarEstado(`6-13 (${desc})`);
};

window.crearEmergencia = () => {
    const tipo = document.getElementById('em-tipo').value;
    const direccion = document.getElementById('em-direccion').value;
    
    if (!direccion) {
        alert("Por favor, marca un punto en el mapa primero.");
        return;
    }

    document.getElementById('modal-emergencia').style.display = 'none';
    document.getElementById('modal-gestion').style.display = 'flex';
    document.getElementById('gest-titulo').innerText = tipo.toUpperCase();
    document.getElementById('gest-lugar').innerText = direccion;
    
    console.log("Emergencia generada:", tipo);
};

window.cerrarGestion = () => {
    document.getElementById('modal-gestion').style.display = 'none';
};

// --- LÓGICA INTERNA ---

async function cargarBases() {
    const snap = await getDocs(collection(db, "bases"));
    snap.forEach(d => { basesCache[d.id] = d.data(); });
}

function initMap() {
    if (map) return;
    const vistaActual = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© CARTO' });
    const satelital = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' });
    
    map = L.map('map', { center: [-33.19, -70.45], zoom: 11, layers: [vistaActual] });
    L.control.layers({ "Mapa": vistaActual, "Satélite": satelital }).addTo(map);

    // Capturar click en el mapa para llenar la ubicación
    map.on('click', (e) => {
        const coords = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
        document.getElementById('em-direccion').value = coords;
        // Al hacer click en el mapa, abrimos el modal si no está abierto
        window.abrirModalEmergencia();
    });
}

function mostrarSeleccionBase() {
    document.getElementById('view-claves').style.display = 'none';
    document.getElementById('view-bases').style.display = 'block';
    const container = document.getElementById('bases-container');
    container.innerHTML = '';
    
    const btnOrig = document.createElement('button');
    btnOrig.className = 'btn-clave';
    btnOrig.style.borderColor = "#ff4500";
    btnOrig.innerText = "VOLVER A BASE ORIGINAL";
    btnOrig.onclick = () => actualizarEstado("6-10");
    container.appendChild(btnOrig);

    Object.keys(basesCache).forEach(idBase => {
        const btn = document.createElement('button');
        btn.className = 'btn-clave';
        btn.innerText = basesCache[idBase].nombre;
        btn.onclick = () => actualizarEstado(`6-10 (${idBase})`);
        container.appendChild(btn);
    });
}

function mostrarInputTramite() {
    document.getElementById('view-claves').style.display = 'none';
    document.getElementById('view-tramite').style.display = 'block';
    document.getElementById('input-613').value = '';
}

async function actualizarEstado(val) {
    try {
        await updateDoc(doc(db, "material_mayor", window.unidadSeleccionada), { estado: val });
        window.cerrarModal();
    } catch (e) { console.error(e); }
}

function escucharVehiculos() {
    onSnapshot(collection(db, "material_mayor"), (snap) => {
        const lista = document.getElementById('lista-vehiculos');
        lista.innerHTML = '';
        const conteoPosiciones = {};

        snap.forEach(d => {
            const v = d.data();
            const id = d.id;
            const est = v.estado || "6-10";
            let lat = v.ubicacion.latitude;
            let lng = v.ubicacion.longitude;

            if (est.includes('6-10')) {
                const match = est.match(/\(([^)]+)\)/);
                const idBase = match ? match[1] : null;
                if (idBase && basesCache[idBase]) {
                    lat = basesCache[idBase].ubicacion.latitude;
                    lng = basesCache[idBase].ubicacion.longitude;
                }
            }

            const posKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            if (!conteoPosiciones[posKey]) conteoPosiciones[posKey] = 0;
            const offset = conteoPosiciones[posKey] * 0.00018; 
            const finalLat = lat + offset;
            const finalLng = lng + offset;
            conteoPosiciones[posKey]++;

            const iconCls = `custom-marker ${est === '6-3' ? 'marker-rojo' : (est.includes('6-10') ? 'marker-azul' : (est === '6-8' ? 'marker-verde' : ''))}`;
            const icon = L.divIcon({ className: iconCls, html: `<span>${id}</span>`, iconSize:[45,22] });
            
            if (markers[id]) markers[id].setLatLng([finalLat, finalLng]).setIcon(icon);
            else markers[id] = L.marker([finalLat, finalLng], {icon}).addTo(map);

            const claseEstado = `estado-${est.split(' ')[0].replace('-','')}`;
            lista.innerHTML += `
                <div class="vehiculo-card ${claseEstado}" onclick="abrirMenuClaves('${id}')">
                    <div><strong>${id}</strong><br><small>${v.tipo || 'Unidad'}</small></div>
                    <div style="text-align:right; font-size:11px;"><strong>${est}</strong></div>
                </div>`;
        });
    });
}

// --- INICIO DE SESIÓN Y CARGA ---

onAuthStateChanged(auth, async (u) => {
    if (u) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        await cargarBases();
        initMap();
        escucharVehiculos();
    }
});
