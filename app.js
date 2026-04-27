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

let map, markers = {}, vehiculosData = [];
let puntoEmergencia = null, cronoInterval = null, segundos = 0;
let unidadSeleccionada = null;

// --- FUNCIONES GLOBALIZADAS PARA BOTONES ---
window.login = () => {
    signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
};
window.logout = () => signOut(auth);

// CLAVES DE MATERIAL MAYOR
window.abrirMenuClaves = (id) => {
    unidadSeleccionada = id;
    document.getElementById('titulo-unidad').innerText = `UNIDAD ${id}`;
    const grid = document.getElementById('grid-claves');
    const claves = ["6-0", "6-3", "6-7", "6-8", "6-9", "6-10", "6-13", "6-14"];
    grid.innerHTML = claves.map(c => `<button class="btn-clave" onclick="cambiarEstado('${c}')">${c}</button>`).join('');
    document.getElementById('modal-claves').style.display = 'flex';
};

window.cerrarModalClaves = () => document.getElementById('modal-claves').style.display = 'none';

window.cambiarEstado = async (estado) => {
    await updateDoc(doc(db, "material_mayor", unidadSeleccionada), { estado: estado });
    cerrarModalClaves();
};

// EMERGENCIA Y DESPACHO
window.abrirModalEmergencia = () => document.getElementById('modal-emergencia').style.display = 'flex';
window.cerrarModalEmergencia = () => document.getElementById('modal-emergencia').style.display = 'none';

window.generarDespacho = () => {
    if(!puntoEmergencia) return alert("Selecciona punto en el mapa");
    document.getElementById('modal-emergencia').style.display = 'none';
    document.getElementById('modal-despacho-activo').style.display = 'flex';
    document.getElementById('despacho-titulo-tipo').innerText = document.getElementById('em-tipo').value;
    iniciarCronometro();
    calcularCercania();
};

function iniciarCronometro() {
    segundos = 0;
    clearInterval(cronoInterval);
    cronoInterval = setInterval(() => {
        segundos++;
        let min = Math.floor(segundos/60).toString().padStart(2,'0');
        let seg = (segundos%60).toString().padStart(2,'0');
        document.getElementById('cronometro-emergencia').innerText = `${min}:${seg}`;
    }, 1000);
}

window.finalizarEmergencia = () => {
    clearInterval(cronoInterval);
    document.getElementById('modal-despacho-activo').style.display = 'none';
};

function calcularCercania() {
    const lista = document.getElementById('unidades-cercanas');
    // Filtramos unidades disponibles y calculamos distancia simple (Euclidiana)
    const sugeridos = vehiculosData
        .map(v => {
            const d = Math.sqrt(Math.pow(v.lat - puntoEmergencia.lat, 2) + Math.pow(v.lng - puntoEmergencia.lng, 2));
            return { ...v, dist: d };
        })
        .sort((a,b) => a.dist - b.dist);

    lista.innerHTML = sugeridos.map(v => `
        <div class="sugerido-card">
            <span>${v.id} (${v.estado})</span>
            <button onclick="despacharUnidad('${v.id}')">DESPACHAR</button>
        </div>
    `).join('');
}

window.despacharUnidad = (id) => {
    document.getElementById('unidades-asignadas').innerHTML += `<div class="asignada-tag">${id} EN RUTA</div>`;
};

// --- MAPA Y FIREBASE ---
function initMap() {
    map = L.map('map').setView([-33.19, -70.45], 11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

    map.on('click', (e) => {
        if(document.getElementById('modal-emergencia').style.display === 'flex') {
            puntoEmergencia = e.latlng;
            document.getElementById('em-direccion').value = `${e.latlng.lat.toFixed(4)},${e.latlng.lng.toFixed(4)}`;
        }
    });
}

onAuthStateChanged(auth, (u) => {
    if(u) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        initMap();
        onSnapshot(collection(db, "material_mayor"), (snap) => {
            const listUI = document.getElementById('lista-vehiculos');
            listUI.innerHTML = '';
            vehiculosData = [];
            snap.forEach(d => {
                const v = d.data();
                vehiculosData.push({id: d.id, lat: v.ubicacion.latitude, lng: v.ubicacion.longitude, estado: v.estado});
                listUI.innerHTML += `<div class="vehiculo-card" onclick="abrirMenuClaves('${d.id}')"><strong>${d.id}</strong> - ${v.estado}</div>`;
                // Actualizar Marcador
                if(markers[d.id]) markers[d.id].setLatLng([v.ubicacion.latitude, v.ubicacion.longitude]);
                else markers[d.id] = L.marker([v.ubicacion.latitude, v.ubicacion.longitude]).addTo(map).bindPopup(d.id);
            });
        });
    }
});
