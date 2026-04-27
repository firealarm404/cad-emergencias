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

// CARGAR BASES
async function cargarBases() {
    const snap = await getDocs(collection(db, "bases"));
    snap.forEach(d => { basesCache[d.id] = d.data(); });
}

// INICIAR MAPA
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

// LÓGICA DE DISTANCIAS
function getDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// EMERGENCIAS
window.abrirModalEmergencia = () => {
    document.getElementById('modal-emergencia').style.display = 'flex';
    puntoEmergencia = null;
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
        b.onclick = () => despacharUnidad(u.id);
        contSugeridas.appendChild(b);
    });
}

async function despacharUnidad(id) {
    await updateDoc(doc(db, "material_mayor", id), { estado: "6-3 (Despachada)" });
    const item = document.createElement('div');
    item.className = 'vehiculo-card estado-63';
    item.innerHTML = `<strong>${id}</strong> - EN TRAYECTO`;
    document.getElementById('asignadas-lista').appendChild(item);
}

window.cerrarGestion = () => {
    document.getElementById('modal-gestion').style.display = 'none';
    clearInterval(cronometro);
};

// ... (Aquí van las funciones de Claves, Login y EscucharVehiculos del código anterior) ...
// Asegúrate de incluir abrirMenuClaves, mostrarSeleccionBase, mostrarInputTramite y guardarTramite.

// FUNCIÓN ESCUCHAR VEHÍCULOS (ACTUALIZADA)
function escucharVehiculos() {
    onSnapshot(collection(db, "material_mayor"), (snap) => {
        const lista = document.getElementById('lista-vehiculos');
        lista.innerHTML = '';
        const conteo = {};
        snap.forEach(d => {
            const v = d.data(), id = d.id, est = v.estado || "6-10";
            let lat = v.ubicacion.latitude, lng = v.ubicacion.longitude;

            if (est.includes('6-10')) {
                const idB = est.match(/\(([^)]+)\)/)?.[1];
                if (idB && basesCache[idB]) { lat = basesCache[idB].ubicacion.latitude; lng = basesCache[idB].ubicacion.longitude; }
            }

            const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
            conteo[key] = (conteo[key] || 0) + 1;
            const finalLat = lat + (conteo[key]-1)*0.00015;

            const color = est.includes('6-3') ? 'marker-rojo' : (est.includes('6-10') ? 'marker-azul' : (est === '6-8' ? 'marker-verde' : ''));
            const icon = L.divIcon({ className: `custom-marker ${color}`, html: `<span>${id}</span>`, iconSize:[45,22] });
            
            if (markers[id]) markers[id].setLatLng([finalLat, lng]).setIcon(icon);
            else markers[id] = L.marker([finalLat, lng], {icon}).addTo(map);

            lista.innerHTML += `<div class="vehiculo-card estado-${est.substr(0,3).replace('-','')}" onclick="abrirMenuClaves('${id}')">
                <strong>${id}</strong> <span>${est}</span></div>`;
        });
    });
}

onAuthStateChanged(auth, async (u) => {
    if (u) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        await cargarBases();
        initMap();
        escucharVehiculos();
    }
});

window.login = () => signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
window.logout = () => signOut(auth);
window.toggleTheme = () => document.body.classList.toggle('light-mode');
window.guardarTramite = async () => {
    const t = document.getElementById('input-613').value;
    await updateDoc(doc(db, "material_mayor", unidadSeleccionada), { estado: `6-13 (${t})` });
    document.getElementById('modal-claves').style.display = 'none';
};
window.abrirMenuClaves = (id) => {
    unidadSeleccionada = id;
    document.getElementById('modal-claves').style.display = 'flex';
    mostrarClavesPrincipales();
};
window.mostrarClavesPrincipales = () => {
    const c = document.getElementById('view-claves');
    c.innerHTML = '';
    document.getElementById('view-claves').style.display = 'grid';
    document.getElementById('view-bases').style.display = 'none';
    document.getElementById('view-tramite').style.display = 'none';
    ["6-3", "6-7", "6-8", "6-10", "6-13"].forEach(cod => {
        const b = document.createElement('button');
        b.className = 'btn-clave'; b.innerText = cod;
        b.onclick = () => {
            if(cod === "6-10") mostrarSeleccionBase();
            else if(cod === "6-13") { document.getElementById('view-claves').style.display='none'; document.getElementById('view-tramite').style.display='block'; }
            else updateDoc(doc(db, "material_mayor", unidadSeleccionada), { estado: cod });
        };
        c.appendChild(b);
    });
};
function mostrarSeleccionBase() {
    document.getElementById('view-claves').style.display = 'none';
    document.getElementById('view-bases').style.display = 'block';
    const cont = document.getElementById('bases-container');
    cont.innerHTML = '';
    Object.keys(basesCache).forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'btn-clave'; btn.innerText = basesCache[b].nombre;
        btn.onclick = () => { updateDoc(doc(db, "material_mayor", unidadSeleccionada), { estado: `6-10 (${b})` }); document.getElementById('modal-claves').style.display='none'; };
        cont.appendChild(btn);
    });
}
window.cerrarModal = () => document.getElementById('modal-claves').style.display = 'none';
