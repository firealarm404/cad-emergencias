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

const listaClaves = [
    { cod: "6-3", desc: "En el lugar" }, { cod: "6-7", desc: "Situación controlada" },
    { cod: "6-8", desc: "Disponible" }, { cod: "6-9", desc: "Se retira" },
    { cod: "6-10", desc: "En Base / Cobertura" }, { cod: "6-11", desc: "En panne" },
    { cod: "6-12", desc: "Sufre colisión" }, { cod: "6-13", desc: "Otros Trámites" },
    { cod: "6-14", desc: "Combustible" }, { cod: "6-15", desc: "Asistencial" },
    { cod: "6-18", desc: "Entra Túnel" }, { cod: "6-19", desc: "Sale Túnel" }
];

async function cargarBases() {
    const snap = await getDocs(collection(db, "bases"));
    snap.forEach(d => { basesCache[d.id] = d.data(); });
}

function initMap() {
    if (map) return;
    const actual = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    map = L.map('map', { center: [-33.19, -70.45], zoom: 11, layers: [actual] });
    L.control.layers({"Mapa": actual, "Satélite": sat}).addTo(map);

    map.on('click', (e) => {
        if (document.getElementById('modal-emergencia').style.display === 'flex') {
            puntoEmergencia = e.latlng;
            document.getElementById('em-direccion').value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
        }
    });
}

function escucharVehiculos() {
    onSnapshot(collection(db, "material_mayor"), (snap) => {
        const lista = document.getElementById('lista-vehiculos');
        lista.innerHTML = '';
        const conteoPosiciones = {};

        snap.forEach(d => {
            const v = d.data(), id = d.id, est = v.estado || "6-10";
            let lat, lng;

            // LÓGICA DE POSICIÓN: Detecta si es cobertura o base original
            if (est.startsWith('6-10') && est.includes('(')) {
                const match = est.match(/\(([^)]+)\)/);
                const idBase = match ? match[1] : null;
                if (idBase && basesCache[idBase]) {
                    lat = basesCache[idBase].ubicacion.latitude;
                    lng = basesCache[idBase].ubicacion.longitude;
                } else {
                    lat = v.ubicacion.latitude; lng = v.ubicacion.longitude;
                }
            } else {
                // Para 6-10 (limpio), 6-3, 6-8, etc. usa la ubicación del documento
                lat = v.ubicacion.latitude; lng = v.ubicacion.longitude;
            }

            const posKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            conteoPosiciones[posKey] = (conteoPosiciones[posKey] || 0) + 1;
            const finalLat = lat + (conteoPosiciones[posKey] - 1) * 0.00018;

            let colorCls = '';
            if (est.startsWith('6-3')) colorCls = 'marker-rojo';
            else if (est.startsWith('6-8')) colorCls = 'marker-verde';
            else if (est.startsWith('6-10')) colorCls = 'marker-azul';

            const icon = L.divIcon({ className: `custom-marker ${colorCls}`, html: `<span>${id}</span>`, iconSize: [45, 22] });
            if (markers[id]) markers[id].setLatLng([finalLat, lng]).setIcon(icon);
            else markers[id] = L.marker([finalLat, lng], {icon}).addTo(map);

            const claseCss = `estado-${est.substring(0,4).replace('-', '').trim()}`;
            lista.innerHTML += `
                <div class="vehiculo-card ${claseCss}" onclick="abrirMenuClaves('${id}')">
                    <div><strong>${id}</strong><br><small>${v.tipo || ''}</small></div>
                    <div style="text-align:right;"><strong>${est}</strong></div>
                </div>`;
        });
    });
}

// GESTIÓN DE CLAVES
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
            else window.actualizarEstado(c.cod);
        };
        container.appendChild(btn);
    });
};

function mostrarSeleccionBase() {
    document.getElementById('view-claves').style.display = 'none';
    document.getElementById('view-bases').style.display = 'block';
    const cont = document.getElementById('bases-container');
    cont.innerHTML = '';

    const btnOrig = document.createElement('button');
    btnOrig.className = 'btn-clave'; btnOrig.style.gridColumn = "span 2";
    btnOrig.style.background = "#333"; btnOrig.style.border = "2px solid #3498db";
    btnOrig.innerHTML = `<strong>BASE ORIGINAL</strong>`;
    btnOrig.onclick = () => window.actualizarEstado("6-10");
    cont.appendChild(btnOrig);
    
    Object.keys(basesCache).forEach(idB => {
        const btn = document.createElement('button');
        btn.className = 'btn-clave'; btn.innerText = basesCache[idB].nombre;
        btn.onclick = () => window.actualizarEstado(`6-10 (${idB})`);
        cont.appendChild(btn);
    });
}

function mostrarInputTramite() {
    document.getElementById('view-claves').style.display = 'none';
    document.getElementById('view-tramite').style.display = 'block';
    document.getElementById('input-613').value = '';
}

window.guardarTramite = () => {
    const val = document.getElementById('input-613').value;
    if(val) window.actualizarEstado(`6-13 (${val})`);
};

window.actualizarEstado = async (val) => {
    await updateDoc(doc(db, "material_mayor", unidadSeleccionada), { estado: val });
    window.cerrarModal();
};

window.cerrarModal = () => document.getElementById('modal-claves').style.display = 'none';

// EMERGENCIAS
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
        b.onclick = async () => {
            await updateDoc(doc(db, "material_mayor", u.id), { estado: "6-3 (Despachada)" });
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
    signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
};
window.logout = () => signOut(auth);
window.toggleTheme = () => document.body.classList.toggle('light-mode');
