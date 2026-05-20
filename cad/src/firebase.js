// src/firebase.js
// Toda la lógica de acceso a Firestore — CRUD, listeners en tiempo real

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore, collection, doc,
  onSnapshot, getDocs, getDoc,
  setDoc, updateDoc, deleteDoc, addDoc,
  query, orderBy, where, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

// ── Init ──────────────────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Helpers ───────────────────────────────────────────────────────────────────
const ts = () => serverTimestamp();

function snap2arr(snapshot) {
  return snapshot.docs.map(d => ({ _id: d.id, ...d.data() }));
}

// ── UNITS ─────────────────────────────────────────────────────────────────────
export function listenUnits(cb) {
  return onSnapshot(collection(db, "units"), snap => cb(snap2arr(snap)));
}

export async function updateUnitStatus(unitId, status, extra = {}) {
  await updateDoc(doc(db, "units", unitId), { status, ...extra, updatedAt: ts() });
}

export async function saveUnit(unit) {
  await setDoc(doc(db, "units", unit.id), { ...unit, updatedAt: ts() }, { merge: true });
}

export async function deleteUnit(unitId) {
  await deleteDoc(doc(db, "units", unitId));
}

export async function getUnits() {
  const snap = await getDocs(collection(db, "units"));
  return snap2arr(snap);
}

// ── EMERGENCIES ───────────────────────────────────────────────────────────────
export function listenEmergencies(cb) {
  const q = query(collection(db, "emergencies"), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => cb(snap2arr(snap)));
}

export async function createEmergency(data) {
  const counter = await getNextEmergId();
  const id = "EMR-" + String(counter).padStart(3, "0");
  await setDoc(doc(db, "emergencies", id), {
    ...data,
    id,
    createdAt: ts(),
    closedAt: null,
    updatedAt: ts()
  });
  return id;
}

export async function updateEmergency(id, data) {
  await updateDoc(doc(db, "emergencies", id), { ...data, updatedAt: ts() });
}

export async function closeEmergency(id) {
  await updateDoc(doc(db, "emergencies", id), {
    status: "resolved",
    closedAt: ts(),
    updatedAt: ts()
  });
}

export async function reopenEmergency(id) {
  await updateDoc(doc(db, "emergencies", id), {
    status: "active",
    closedAt: null,
    updatedAt: ts()
  });
}

async function getNextEmergId() {
  const snap = await getDocs(collection(db, "emergencies"));
  return snap.size + 1;
}

// ── EMERGENCY TYPES ───────────────────────────────────────────────────────────
export async function getEmergencyTypes() {
  const snap = await getDocs(collection(db, "emergencyTypes"));
  return snap2arr(snap);
}

export function listenEmergencyTypes(cb) {
  return onSnapshot(collection(db, "emergencyTypes"), snap => cb(snap2arr(snap)));
}

export async function saveEmergencyType(typeDoc) {
  await setDoc(doc(db, "emergencyTypes", typeDoc.name), typeDoc, { merge: true });
}

export async function deleteEmergencyType(name) {
  await deleteDoc(doc(db, "emergencyTypes", name));
}

// ── SEED (run once to populate Firestore from scratch) ───────────────────────
export async function seedFirestore() {
  const unitsSnap = await getDocs(collection(db, "units"));
  if (!unitsSnap.empty) { console.log("[seed] already seeded"); return; }

  const batch = writeBatch(db);

  const UNITS = [
    { id:"B1",      name:"Brigada Bronces",           brigade:"Bronces",        type:"bomba", status:"6-8",  lat:-33.14662, lng:-70.28583 },
    { id:"B2",      name:"Brigada Tórtolas",           brigade:"Tórtolas",       type:"bomba", status:"6-10", lat:-33.14554, lng:-70.69935 },
    { id:"UIR-M",   name:"Brigada Mina",               brigade:"Mina",           type:"uir",   status:"6-3",  lat:-33.15986, lng:-70.29357 },
    { id:"UIR-E",   name:"Brigada Ermita",             brigade:"Ermita",         type:"uir",   status:"6-8",  lat:-33.36839, lng:-70.39768 },
    { id:"UIR-STP", name:"Brigada Mineroducto",        brigade:"Mineroducto",    type:"uir",   status:"6-9",  lat:-33.19051, lng:-70.33926 },
    { id:"S1",      name:"Policlínico Pérez Caldera",  brigade:"Policlínico PC", type:"amb",   status:"6-8",  lat:-33.19051, lng:-70.33926 },
    { id:"S2",      name:"Policlínico Las Tórtolas",   brigade:"Policlínico LT", type:"amb",   status:"6-15", lat:-33.14568, lng:-70.69952 },
    { id:"S3",      name:"SPA 220",                    brigade:"SPA 220",        type:"amb",   status:"6-11", lat:-33.14683, lng:-70.28571 },
  ];

  for (const u of UNITS) {
    batch.set(doc(db, "units", u.id), { ...u, updatedAt: ts() });
  }

  const TYPES = {
    "INCENDIO": ["Amago incendio equipos mineros","Amago incendio vehículos pesados","Amago incendio vehículos livianos","Amago incendio instalaciones industriales","Incendio equipos mineros","Incendio vehículos pesados","Incendio vehículos livianos","Incendio instalaciones","Incendio fuera de las instalaciones","Incendio forestal","Pastizales y/o Basura"],
    "VEHICULAR": ["Choque equipos mineros","Choque vehículos pesados","Choque vehículos livianos","Choque vehículos pesados fuera instalaciones","Choque vehículos livianos fuera instalaciones","Desbarrancamiento equipos mineros","Desbarrancamiento vehículos pesados","Desbarrancamiento vehículos livianos","Desbarrancamiento vehículos pesados fuera instalaciones","Desbarrancamiento vehículos livianos fuera instalaciones","Volcamiento equipo minero","Volcamiento vehículos pesados","Volcamiento vehículos livianos","Volcamiento vehículos pesados fuera instalaciones","Volcamiento vehículos livianos fuera instalaciones","Colisión equipo minero","Colisión vehículos pesados","Colisión vehículos livianos","Colisión vehículos pesados fuera instalaciones","Colisión vehículos livianos fuera instalaciones","Deslizamiento de equipos mineros"],
    "RESCATE MÉDICO": ["Caída mismo nivel","Caída diferente nivel","Derrumbe","Atrapamiento","Fractura abierta","Fractura cerrada","Esguince extremidad superior","Esguince extremidad inferior","Desmayo / Inconsciente","Pérdida de conciencia","Crisis de Pánico / Ansiedad","Golpeado por","PCR","Rescate vertical","Rescate espacio confinados","Atropello","Caída de particular","Encerramiento en ascensor","Corte (brazo, mano, pierna)","Pérdida de memoria","Otros no categorizados"],
    "HAZMAT": ["Derrame de sustancias peligrosas","Fuga de sustancias peligrosas","Incidente con sustancias peligrosas varias"],
    "SIMULACROS": ["Simulacro Documental","Simulacro Proceso","Simulacro Divisional"],
    "SÍSMICO": ["Sismo leve en faena","Sismo moderado con evacuación preventiva","Terremoto grave con daños estructurales"],
    "METEOROLÓGICO": ["Tormenta eléctrica en zona alta","Nevadas intensas que bloquean accesos","Lluvia torrencial que afecta caminos / tranques","Ola de calor que acelera derretimiento de nieve","Viento blanco o ventiscas en zona alta"],
    "GEOLÓGICO": ["Deslizamiento de terreno","Remoción en masa","Falla geotécnica en botaderos","Caída de rocas en zonas de tránsito","Inestabilidad de taludes","Aluvión por deshielo o lluvias intensas"],
    "AMBIENTAL": ["Aumento de material particulado por vientos","Contaminación a cursos de agua","Afectación a flora / fauna"],
    "OTROS": ["Limpieza de rodados / arboleda en rutas OLB","Activación de alarma SPCI","Contacto eléctrico","Desperfecto mecánico rutas G-21, G-245","Desperfecto mecánico ruta STP-OLB","Rescate animal","Olor no determinado","Daño a infraestructura crítica","Interrupción de suministro eléctrico","Crecida de ríos por lluvias intensas","Inundación de instalaciones","Caída de árbol","Otros no categorizados"],
  };

  for (const [name, subtypes] of Object.entries(TYPES)) {
    batch.set(doc(db, "emergencyTypes", name), { name, subtypes });
  }

  await batch.commit();
  console.log("[seed] Firestore seeded successfully");
}
