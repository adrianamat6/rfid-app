import { Injectable } from '@angular/core';
import { SavedConfig, Escaneo } from '../interfaces/rfid.models';

@Injectable({
  providedIn: 'root'
})
export class TrazabilidadService {
  private readonly KEY_CONFIGS = 'trazabilidad_configs';
  private readonly KEY_ACTIVE_ID = 'trazabilidad_active_id';
  private readonly KEY_SCANS = 'trazabilidad_scans';

  constructor() {}

  // --- CONFIGURACIONES ---
  getConfigs(): SavedConfig[] {
    const stored = localStorage.getItem(this.KEY_CONFIGS);
    return stored ? JSON.parse(stored) : [];
  }

  saveConfig(config: SavedConfig): void {
    const configs = this.getConfigs();
    const index = configs.findIndex(c => c.id === config.id);
    if (index >= 0) configs[index] = config;
    else configs.unshift(config);
    localStorage.setItem(this.KEY_CONFIGS, JSON.stringify(configs));
  }

  // --- LÍNEA ACTIVA ---
  setActiveConfigId(id: string | null): void {
    if (id) localStorage.setItem(this.KEY_ACTIVE_ID, id);
    else localStorage.removeItem(this.KEY_ACTIVE_ID);
  }

  getActiveConfig(): SavedConfig | null {
    const id = localStorage.getItem(this.KEY_ACTIVE_ID);
    return id ? (this.getConfigs().find(c => c.id === id) || null) : null;
  }

  // --- GESTIÓN DE ALMACENAMIENTO (PRIVADO) ---
  private getScansStorage(): Record<string, Record<string, Escaneo[]>> {
    const stored = localStorage.getItem(this.KEY_SCANS);
    return stored ? JSON.parse(stored) : {};
  }

  private saveScansStorage(data: Record<string, Record<string, Escaneo[]>>): void {
    localStorage.setItem(this.KEY_SCANS, JSON.stringify(data));
  }

  // --- AÑADIR ESCANEOS ---
  
  // Para Operario (un solo chip)
  addScan(configId: string, puntoNombre: string, scan: Escaneo): void {
    const storage = this.getScansStorage();
    if (!storage[configId]) storage[configId] = {};
    if (!storage[configId][puntoNombre]) storage[configId][puntoNombre] = [];
    
    storage[configId][puntoNombre].unshift(scan);
    this.saveScansStorage(storage);
  }

  // Para Inventario (muchos chips a la vez)
  addBulkScans(configId: string, puntoNombre: string, scans: Escaneo[]): void {
    const storage = this.getScansStorage();
    if (!storage[configId]) storage[configId] = {};
    storage[configId][puntoNombre] = [...scans, ...(storage[configId][puntoNombre] || [])];
    this.saveScansStorage(storage);
  }

  // --- CONSULTAS Y LIMPIEZA ---
  getScansForPoint(configId: string, puntoNombre: string): Escaneo[] {
    return this.getScansStorage()[configId]?.[puntoNombre] || [];
  }

  clearPointScans(configId: string, puntoNombre: string): void {
    const storage = this.getScansStorage();
    if (storage[configId] && storage[configId][puntoNombre]) {
      delete storage[configId][puntoNombre];
      this.saveScansStorage(storage);
    }
  }

  // --- LÓGICA DE PROGRESO ---
  obtenerProgresoChip(epc: string, config: SavedConfig): { porcentaje: number, etiqueta: string } {
    const puntos = config.locations;
    const storage = this.getScansStorage()[config.id] || {};
    
    let ultimoPuntoIndex = -1;
    puntos.forEach((nombre, index) => {
      const scansEnPunto = storage[nombre] || [];
      if (scansEnPunto.some(s => s.chipId === epc)) {
        ultimoPuntoIndex = index;
      }
    });

    const actual = ultimoPuntoIndex + 1;
    const total = puntos.length;
    const porcentaje = total > 0 ? Math.round((actual / total) * 100) : 0;

    return {
      porcentaje,
      etiqueta: `${actual}/${total} puntos`
    };
  }
}