// --- CONFIGURACIÓN Y TRAZABILIDAD ---
export interface SavedConfig {
  id: string;
  name: string;
  locations: string[];
  createdAt: string;
  updatedAt: string;
}

// --- OPERARIO / ESCANEO ---
export interface Escaneo {
  id: string;
  chipId: string;
  puntoNombre: string;
  timestamp: string;
}

// --- INVENTARIO ---
export interface ChipResultado {
  epc: string;
  count: number;
  rssi: string;
  modelo: string;
}

export interface ModeloResumen {
  nombre: string;
  cantidad: number;
}

export interface Movimiento {
  id: number;
  hora: string;
  lugar: string;
  evento: string;
  fecha: string;
  responsable: string;
}