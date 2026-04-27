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
let unidadSeleccionada = null, puntoEmergencia = null, cronometro = null;

// 1. LISTA COMPLETA DE CLAVES RESTAURADA
const listaClaves = [
    { cod: "6-3", desc: "En el lugar" }, { cod: "6-7", desc: "Situación controlada" },
    { cod: "6-8", desc: "Disponible" }, { cod: "6-9", desc: "Se retira del lugar" },
    { cod: "6-10", desc: "En Base (Origen/Cobertura)" }, { cod: "6-11", desc: "En panne" },
    { cod: "6-12", desc: "Sufre colisión" }, { cod: "6-13", desc: "Otros Trámites" },
    { cod: "6-14", desc: "Carga Combustible" }, { cod: "6-15", desc: "Centro Asistencial" },
    { cod: "6-18", desc: "Entra a túnel" }, { cod: "6-19", desc: "Sale del túnel" }
];

async function cargarBases() {
    const snap = await getDocs(collection(db, "bases"));
    snap.forEach(d => { basesCache[d.id] = d.data(); });
}

function initMap() {
    if (map) return;
    const actual = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    const calles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

    map = L.map('map', { center: [-33.19, -70.45], zoom: 11, layers: [actual] });
    L.control.layers({"Vista Actual": actual, "Satelital": sat, "Calles": calles}).addTo(map);

    map.on('click', (e) => {
        if (document.getElementById('modal-emergencia').style.display === 'flex') {
            puntoEmergencia = e.latlng;
            document.getElementById('em-direccion').value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
        }
    });
}

// LÓGICA DE VEHÍCULOS (CORREGIDA)
function escucharVehiculos() {
    onSnapshot(collection(db, "material_mayor"), (snap) => {
        const lista = document.getElementById('lista-vehiculos');
        lista.innerHTML = '';
        const conteoPosiciones = {};

        snap.forEach(d => {
            const v = d.data();
            const id = d.id;
            const est = v.estado || "6-10";
            
            let lat, lng;

            // Determinar posición
            if (est.includes('6-10')) {
                const match = est.match(/\(([^)]+)\)/);
                const idBase = match ? match[1] : null;
                if (idBase && basesCache[idBase]) {
                    lat = basesCache[idBase].ubicacion.latitude;
                    lng = basesCache[idBase].ubicacion.longitude;
                } else {
                    lat = v.ubicacion.latitude;
                    lng = v.ubicacion.longitude;
                }
            } else {
                lat = v.ubicacion.latitude;
                lng = v.ubicacion.longitude;
            }

            // Evitar solapamiento
            const posKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            if (!conteoPosiciones[posKey]) conteoPosiciones[posKey] = 0;
            const offset = conteoPosiciones[posKey] * 0.00018; 
            const finalLat = lat + offset;
            const finalLng = lng + offset;
            conteoPosiciones[posKey]++;

            // Marcador en Mapa
            const colorCls = est.includes('6-3') ? 'marker-rojo' : (est.includes('6-10') ? 'marker-azul' : (est === '6-8' ? 'marker-verde' : ''));
            const icon = L.divIcon({ className: `custom-marker ${colorCls}`, html: `<span>${id}</span>`, iconSize:[45,22] });
            
            if (markers[id]) {
                markers[id].setLatLng([finalLat, finalLng]).setIcon(icon);
            } else {
                markers[id] = L.marker([finalLat, finalLng], {icon}).addTo(map);
            }

            // Card en Sidebar
            const claseEstado = `estado-${est.split(' ')[0].replace('-','')}`;
            lista.innerHTML += `
                <div class="vehiculo-card ${claseEstado}" onclick="abrirMenuClaves('${id}')">
                    <strong>${id}</strong>
                    <span style="font-size:10px;">${est}</span>
                </div>`;
        });
    });
}

// MODAL DE CLAVES
window.abrirMenuClaves = (id) => {
    unidadSeleccionada = id;
    document.getElementById('modal-titulo').innerText = `Unidad: ${id}`;
    document.getElementById('modal-claves').style.display = 'flex';
    mostrarClavesPrincipales();
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

function mostrarSeleccionBase() {
    document.getElementById('view-claves').style.display = 'none';
    document.getElementById('view-bases').style.display = 'block';
    const cont = document.getElementById('bases-container');
    cont.innerHTML = '<button class="btn-clave" style="grid-column: span 2; border-color:orange;" onclick="actualizarEstado(\'6-10\')">BASE ORIGINAL</button>';
    
    Object.keys(basesCache).forEach(idB => {
        const btn = document.createElement('button');
        btn.className = 'btn-clave';
        btn.innerText = basesCache[idB].nombre;
        btn.onclick = () => actualizarEstado(`6-10 (${idB})`);
        cont.appendChild(btn);
    });
}

function mostrarInputTramite() {
    document.getElementById('view-claves').style.display = 'none';
    document.getElementById('view-tramite').style.display = 'block';
    document.getElementById('input-613').value = '';
}

window.guardarTramite = () => {
    const txt = document.getElementById('input-613').value;
    if(txt) actualizarEstado(`6-13 (${txt})`);
};

async function actualizarEstado(val) {
    await updateDoc(doc(db, "material_mayor", unidadSeleccionada), { estado: val });
    window.cerrarModal();
}

window.cerrarModal = () => document.getElementById('modal-claves').style.display = 'none';

// EMERGENCIA Y DISTANCIA
function getDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

window.abrirModalEmergencia = () => {
    document.getElementById('modal-emergencia').style.display = 'flex';
    puntoEmergencia = null;
    document.getElementById('em-direccion').value = '';
};

window.cerrarModalEmergencia = () => document.getElementById('modal-emergencia').style.display = 'none';

window.crearEmergencia = () => {
    const data = {
        tipo: document.getElementById('em-tipo').value,
        lugar: document.getElementById('em-direccion').value,
        inicio: Date.now(),
        lat: puntoEmergencia ? puntoEmergencia.lat : -33.19,
        lng: puntoEmergencia ? puntoEmergencia.lng : -70.45
    };
    abrirGestion(data);
    cerrarModalEmergencia();
};

function abrirGestion(data) {
    document.getElementById('modal-gestion').style.display = 'flex';
    document.getElementById('gest-titulo').innerText = data.tipo;
    document.getElementById('gest-hora').innerText = new Date(data.inicio).toLocaleTimeString();
    document.getElementById('gest-lugar').innerText = data.lugar;
    
    if (cronometro) clearInterval(cronometro);
    cronometro = setInterval(() => {
        const segs = Math.floor((Date.now() - data.inicio)/1000);
        document.getElementById('gest-cronometro').innerText = new Date(segs * 1000).toISOString().substr(11, 8);
    }, 1000);

    const sugeridas = [];
    for (let id in markers) {
        const mPos = markers[id].getLatLng();
        sugeridas.push({ id, dist: getDistancia(data.lat, data.lng, mPos.lat, mPos.lng) });
    }
    sugeridas.sort((a,b) => a.dist - b.dist);

    const contSugeridas = document.getElementById('sugerencias-lista');
    contSugeridas.innerHTML = '';
    sugeridas.slice(0, 4).forEach(u => {
        const b = document.createElement('button');
        b.className = 'btn-sugerido';
        b.innerHTML = `<strong>${u.id}</strong> a ${u.dist.toFixed(1)} km`;
        b.onclick = () => {
            updateDoc(doc(db, "material_mayor", u.id), { estado: "6-3 (Despachada)" });
            const item = document.createElement('div');
            item.className = 'vehiculo-card estado-63';
            item.innerHTML = `<strong>${u.id}</strong> - ASIGNADA`;
            document.getElementById('asignadas-lista').appendChild(item);
        };
        contSugeridas.appendChild(b);
    });
}

window.cerrarGestion = () => {
    document.getElementById('modal-gestion').style.display = 'none';
    clearInterval(cronometro);
    document.getElementById('asignadas-lista').innerHTML = '';
};

// LOGIN Y AUTH
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

window.login = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p).catch(err => alert("Error: " + err.message));
};
window.logout = () => signOut(auth);
window.toggleTheme = () => document.body.classList.toggle('light-mode');

// EXPOSICIÓN DE FUNCIONES
window.mostrarClavesPrincipales = mostrarClavesPrincipales;
window.mostrarInputTramite = mostrarInputTramite;
