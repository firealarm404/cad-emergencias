// src/constants.js

export const STATUS_MAP = {
  "6-3":  { label: "6-3 En el lugar",           color: "#ff3344", cls: "s-63"  },
  "6-8":  { label: "6-8 Disponible",             color: "#00cc66", cls: "s-68"  },
  "6-9":  { label: "6-9 Se retira del lugar",    color: "#ffaa00", cls: "s-69"  },
  "6-10": { label: "6-10 En la Base",             color: "#6a8ab0", cls: "s-610" },
  "6-11": { label: "6-11 En panne",              color: "#ff6b35", cls: "s-611" },
  "6-12": { label: "6-12 Colisión Mat. Mayor",   color: "#ff3344", cls: "s-612" },
  "6-13": { label: "6-13 Trámite de Brigada",    color: "#ffaa00", cls: "s-613" },
  "6-14": { label: "6-14 Carga de Combustible",  color: "#ffaa00", cls: "s-614" },
  "6-15": { label: "6-15 Centro Asistencial",    color: "#aa44ff", cls: "s-615" },
  "6-18": { label: "6-18 Ingresa a túnel",       color: "#00d4ff", cls: "s-618" },
  "6-19": { label: "6-19 Sale del túnel",        color: "#00d4ff", cls: "s-619" },
};

export const BASES = [
  { id: "base-bronces",    name: "Base Bronces",                  lat: -33.14662143611822, lng: -70.28583374914044 },
  { id: "base-220",        name: "Base 220",                      lat: -33.14682707629566, lng: -70.28571413531755 },
  { id: "base-mina",       name: "Base Mina",                     lat: -33.159861618653856, lng: -70.29357723357634 },
  { id: "base-perez",      name: "Base Pérez Caldera",            lat: -33.19051211335887, lng: -70.33926026343906 },
  { id: "base-tortolas",   name: "Base Tórtolas",                 lat: -33.14553886977589, lng: -70.69935489471872 },
  { id: "base-poli-lt",    name: "Base Policlínico Las Tórtolas", lat: -33.14568448993652, lng: -70.69952359685848 },
  { id: "base-ermita",     name: "Base Ermita",                   lat: -33.3683866974452,  lng: -70.3976797205951  },
];

export const CENTROS_ASISTENCIALES = [
  "Hospital San Juan de Dios",
  "Hospital Clínico San Borja Arriarán",
  "Hospital Barros Luco Trudeau",
  "Hospital Sótero del Río",
  "Hospital El Pino",
  "Hospital Padre Hurtado",
  "Hospital Félix Bulnes",
  "Hospital del Salvador",
  "Hospital Luis Calvo Mackenna",
  "Hospital Roberto del Río",
  "Hospital Luis Tisné",
  "Hospital Exequiel González Cortés",
  "Hospital de Urgencia Asistencia Pública (Posta Central)",
  "Hospital Metropolitano de Santiago",
  "Hospital del Tórax",
  "Clínica Alemana",
  "Clínica Las Condes",
  "Clínica Indisa",
  "Clínica Santa María",
  "Clínica Dávila",
  "Clínica Bupa Santiago",
  "Clínica Vespucio",
  "Clínica Universidad de los Andes",
  "Clínica RedSalud UC Christus",
  "Clínica Dávila Vespucio",
  "Hospital Clínico Mutual de Seguridad CChC",
  "Hospital del Trabajador ACHS",
  "Hospital IST Santiago",
];

export const PRIORITY_COLORS = {
  alta:  "#ff3344",
  media: "#ffaa00",
  baja:  "#00cc66",
};
