# 🚨 CAD · Centro de Monitoreo de Emergencias

Sistema CAD (Computer-Aided Dispatch) con Firebase Firestore en tiempo real, Leaflet + CartoDB/Satélite, y tres vistas (Público, Operador, Administrador).

---

## 🚀 Setup Rápido

### 1. Crear proyecto en Firebase

1. Ve a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Crea un nuevo proyecto (ej: `cad-emergencias`)
3. En **Firestore Database** → Crear base de datos → Modo de prueba
4. En **Project Settings** → **Your apps** → Agrega una app Web (ícono `</>`)
5. Copia el objeto `firebaseConfig`

### 2. Configurar el proyecto

Abre `public/index.html` y reemplaza el bloque de configuración (~línea 215):

```js
const firebaseConfig = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROJECT.firebaseapp.com",
  projectId:         "TU_PROJECT_ID",
  storageBucket:     "TU_PROJECT.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};
```

### 3. Reglas de Firestore (para producción)

En Firebase Console → Firestore → Rules, usa:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Público: solo lectura
    match /units/{doc}        { allow read: if true; allow write: if request.auth != null; }
    match /emergencies/{doc}  { allow read: if true; allow write: if request.auth != null; }
    match /emergencyTypes/{doc}{ allow read: if true; allow write: if request.auth != null; }
  }
}
```

> Para demo: deja en modo prueba (permite todo por 30 días).

---

## 🌐 Deploy en GitHub Pages

### Opción A — GitHub Pages (más simple)

```bash
# 1. Crea repo en GitHub
git init
git add .
git commit -m "feat: initial CAD system"
git remote add origin https://github.com/TU_USUARIO/cad-emergencias.git
git push -u origin main

# 2. En GitHub → Settings → Pages
#    Source: Deploy from branch → main → /public
```

Tu app queda en: `https://TU_USUARIO.github.io/cad-emergencias/`

### Opción B — Firebase Hosting (recomendado)

```bash
# Instala Firebase CLI
npm install -g firebase-tools

# Login y configura
firebase login
firebase init hosting

# Cuando te pregunte:
# - Public directory: public
# - Single-page app: No
# - Overwrite index.html: No

# Deploy
firebase deploy
```

Tu app queda en: `https://TU_PROJECT.web.app`

---

## 📁 Estructura del proyecto

```
cad-emergencias/
├── public/
│   └── index.html          ← Aplicación completa (standalone)
├── src/
│   ├── firebaseConfig.js   ← Config template (referencia)
│   ├── firebase.js         ← Capa de datos Firebase (referencia)
│   └── constants.js        ← Constantes: bases, hospitales, claves
├── .gitignore
├── package.json
└── README.md
```

> **Nota:** `public/index.html` es completamente autónomo (no requiere bundler).
> Todo el código está inline con ES Modules via CDN.

---

## 🗺️ Capas de Mapa

| Capa | Descripción |
|------|-------------|
| **CartoDB Dark** | Mapa oscuro táctico (por defecto) |
| **Satélite** | Imágenes satelitales Esri World Imagery |
| **Calles** | OpenStreetMap estándar |

---

## 🚒 Material Mayor configurado

| ID | Brigada | Tipo |
|----|---------|------|
| B1 | Brigada Bronces | Carro Bomba |
| B2 | Brigada Tórtolas | Carro Bomba |
| UIR-M | Brigada Mina | UIR Camioneta |
| UIR-E | Brigada Ermita | UIR Camioneta |
| UIR-STP | Brigada Mineroducto | UIR Camioneta |
| S1 | Policlínico Pérez Caldera | Ambulancia |
| S2 | Policlínico Las Tórtolas | Ambulancia |
| S3 | SPA 220 | Ambulancia |

---

## 📟 Claves de Estado

| Clave | Descripción |
|-------|-------------|
| 6-3 | En el lugar |
| 6-8 | Disponible |
| 6-9 | Se retira del lugar |
| 6-10 | En la Base (selecciona base destino) |
| 6-11 | En panne |
| 6-12 | Colisión Material Mayor |
| 6-13 | Trámite de Brigada |
| 6-14 | Carga de Combustible |
| 6-15 | Centro Asistencial (selecciona hospital/clínica) |
| 6-18 | Ingresa a túnel |
| 6-19 | Sale del túnel |

---

## 🔧 Modo sin Firebase

Si no configuras Firebase, el sistema funciona en **modo demo local** con datos de muestra. El indicador de conexión (punto arriba a la derecha) aparecerá en rojo.

---

## 📦 Sin Build Step

Este proyecto no requiere Webpack, Vite ni compilación.
Abre `public/index.html` directamente en el navegador o sírvelo con cualquier servidor estático.

```bash
# Servidor local rápido (Python)
cd public && python3 -m http.server 8080

# O con Node
npx serve public
```
