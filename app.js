import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Tu configuración de Firebase
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

function initMap() {
    // Centrado en las coordenadas que me pasaste
    map = L.map('map').setView([-33.1467, -70.2857], 13); 
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

// Escuchar cambios en los vehículos
function escucharVehiculos() {
    onSnapshot(collection(db, "material_mayor"), (snapshot) => {
        const lista = document.getElementById('lista-vehiculos');
        lista.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const v = doc.data();
            const id = doc.id;
            
            // EXTRACCIÓN DEL GEOPOINT:
            // v.ubicacion es el nombre del campo en Firebase que tiene el GeoPoint
            const lat = v.ubicacion.latitude;
            const lng = v.ubicacion.longitude;

            // Actualizar marcador en el mapa
            if (markers[id]) {
                markers[id].setLatLng([lat, lng]);
            } else {
                markers[id] = L.marker([lat, lng]).addTo(map).bindPopup(`<b>${id}</b><br>Estado: ${v.estado}`);
            }

            // Agregar a la lista lateral con el color según estado
            lista.innerHTML += `
                <div class="vehiculo-card">
                    <span><strong>${id}</strong> - ${v.tipo || 'Unidad'}</span>
                    <span class="estado-${v.estado.replace('-', '')}">${v.estado}</span>
                </div>
            `;
        });
    });
}

// --- Funciones de Sesión ---
window.login = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Error: " + err.message));
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        if (!map) initMap();
        escucharVehiculos();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
});