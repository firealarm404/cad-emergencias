// 1. Importaciones de los módulos de Firebase (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. Tu configuración (Ya tiene tus credenciales aplicadas)
const firebaseConfig = {
  apiKey: "AIzaSyBWixMbVJrcIgK5eIkHcnx91dCdUZVWEJY",
  authDomain: "cad-emergencias-24da0.firebaseapp.com",
  projectId: "cad-emergencias-24da0",
  storageBucket: "cad-emergencias-24da0.firebasestorage.app",
  messagingSenderId: "799146039442",
  appId: "1:799146039442:web:660447d59af47a94e96e4b"
};

// 3. Inicialización
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let map;
let markers = {};

// --- FUNCIONES DEL MAPA ---

function initMap() {
    // Si el mapa ya existe, no lo reiniciamos
    if (map) return;

    // Centrado en las coordenadas de tu faena
    map = L.map('map').setView([-33.1467, -70.2857], 14); 
    
    // Capa de mapa oscuro (CartoDB DarkMatter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);
}

// --- LÓGICA DE USUARIOS Y ROLES ---

// Función para el botón de Login
window.login = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    
    if(!email || !pass) return alert("Completa todos los campos");

    signInWithEmailAndPassword(auth, email, pass)
        .catch(err => alert("Error de acceso: " + err.message));
};

// Función para cerrar sesión
window.logout = () => {
    signOut(auth);
};

// Observador de estado de autenticación (Detecta si entras o sales)
onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    const userInfo = document.getElementById('user-info');
    const controlesOp = document.getElementById('controles-operador');

    if (user) {
        // Buscamos el rol en la colección 'usuarios' usando el UID
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Mostrar interfaz principal
            loginScreen.style.display = 'none';
            mainApp.style.display = 'block';
            userInfo.innerText = `Conectado: ${userData.nombre} | Rol: ${userData.rol}`;

            // Control de visibilidad según ROL
            if (userData.rol === 'admin' || userData.rol === 'operador') {
                controlesOp.style.display = 'block';
            }

            // Iniciar mapa y rastreo
            initMap();
            escucharVehiculos();
        } else {
            alert("Error: Usuario autenticado pero sin registro en Firestore (Colección 'usuarios').");
            signOut(auth);
        }
    } else {
        // Usuario desconectado
        loginScreen.style.display = 'flex';
        mainApp.style.display = 'none';
    }
});

// --- RASTREO DE MATERIAL MAYOR ---

function escucharVehiculos() {
    // Escucha en tiempo real la colección 'material_mayor'
    onSnapshot(collection(db, "material_mayor"), (snapshot) => {
        const lista = document.getElementById('lista-vehiculos');
        lista.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const v = doc.data();
            const id = doc.id; // Ejemplo: B1, S2...

            // Extraer GeoPoint (ubicacion.latitude y ubicacion.longitude)
            if (v.ubicacion) {
                const lat = v.ubicacion.latitude;
                const lng = v.ubicacion.longitude;

                // Si el marcador ya existe, lo movemos. Si no, lo creamos.
                if (markers[id]) {
                    markers[id].setLatLng([lat, lng]);
                } else {
                    markers[id] = L.marker([lat, lng]).addTo(map)
                        .bindPopup(`<b>${id}</b><br>Estado: ${v.estado}`);
                }

                // Actualizar la lista lateral con colores
                // Quitamos el guion para que la clase CSS sea 'estado-68'
                const claseEstado = `estado-${v.estado.replace('-', '')}`;
                
                lista.innerHTML += `
                    <div class="vehiculo-card">
                        <div>
                            <strong>${id}</strong><br>
                            <small>${v.tipo || 'Unidad'}</small>
                        </div>
                        <span class="${claseEstado}" style="font-weight:bold;">${v.estado}</span>
                    </div>
                `;
            }
        });
    });
}
