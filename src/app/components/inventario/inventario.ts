import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TrazabilidadService } from '../../services/trazabilidad.service';
import { SavedConfig, Escaneo, ModeloResumen } from '../../interfaces/rfid.models';

interface PuntoConDatos {
  id: number;
  nombre: string;
  chips: string[];  // EPCs únicos
  totalLecturas: number;
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css'
})
export class InventarioComponent implements OnInit {

  // ── LÍNEA ACTIVA ──
  lineaActiva: SavedConfig | null = null;
  puntos: PuntoConDatos[] = [];
  puntoActualIdx: number = 0;

  // ── CATÁLOGO (común para todos los puntos) ──
  catalogo: { prefijo: string; nombre: string }[] = [];
  archivoCatalogoNombre: string = '';

  // ── CSV TEMPORAL ──
  archivoCSVNombre: string = '';
  chipsTempCSV: string[] = [];

  // ── COMPARATIVA ──
  mostrarComparativa: boolean = false;
  perdidas: { punto: string; chips: string[] }[] = [];
  apariciones: { punto: string; chips: string[] }[] = [];

  constructor(
    private router: Router,
    private trazabilidadService: TrazabilidadService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.lineaActiva = this.trazabilidadService.getActiveConfig();
    
    if (!this.lineaActiva) {
      alert('No hay línea activa. Ve a Configuración primero.');
      this.router.navigate(['/configuracion']);
      return;
    }

    // Inicializar puntos cargando lo que ya hay en el servicio (localStorage)
    this.puntos = this.lineaActiva.locations.map((nombre, id) => {
      const escaneos = this.trazabilidadService.getScansForPoint(this.lineaActiva!.id, nombre);
      const chipsUnicos = Array.from(new Set(escaneos.map(e => e.chipId)));
      
      return {
        id,
        nombre,
        chips: chipsUnicos,
        totalLecturas: escaneos.length
      };
    });
  }

  get puntoActual(): PuntoConDatos {
    return this.puntos[this.puntoActualIdx];
  }

  irAPunto(idx: number): void {
    this.puntoActualIdx = idx;
    this.archivoCSVNombre = '';
    this.chipsTempCSV = [];
    this.mostrarComparativa = false;
    this.cdr.detectChanges();
  }

  // ══════════════════════════════════════════════════════════════
  // GESTIÓN DE CATÁLOGO
  // ══════════════════════════════════════════════════════════════

  onCatalogoSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.archivoCatalogoNombre = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      this.catalogo = this.parsearCatalogo(text);
      this.cdr.detectChanges();
    };
    reader.readAsText(file, 'utf-8');
  }

  private parsearCatalogo(text: string): { prefijo: string; nombre: string }[] {
    const lineas = text.split(/\r?\n/).filter(l => l.trim());
    const resultado: { prefijo: string; nombre: string }[] = [];

    for (const linea of lineas) {
      const cols = linea.split(/[,;\t]/).map(c => c.replace(/['"]+/g, '').trim());
      const prefijo = cols[0]?.toUpperCase();
      const nombre = cols[1];

      if (prefijo && prefijo !== 'EPC' && nombre) {
        resultado.push({ prefijo, nombre });
      }
    }
    return resultado;
  }

  // ══════════════════════════════════════════════════════════════
  // GESTIÓN DE CSV POR PUNTO
  // ══════════════════════════════════════════════════════════════

  onCSVSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.archivoCSVNombre = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      this.chipsTempCSV = this.parsearCSV(text);
      this.cdr.detectChanges();
    };
    reader.readAsText(file, 'utf-8');
  }

  private parsearCSV(text: string): string[] {
    const lineas = text.split(/\r?\n/).filter(l => l.trim());
    const chips: string[] = [];

    for (const linea of lineas) {
      const cols = linea.split(/[,;\t]/).map(c => c.replace(/['"]+/g, '').trim());
      const epc = cols[0];
      if (epc && epc.toUpperCase() !== 'EPC' && epc.length >= 6) {
        chips.push(epc);
      }
    }
    return Array.from(new Set(chips));
  }

  guardarEnPunto(): void {
    if (!this.chipsTempCSV.length || !this.lineaActiva) return;

    const escaneos: Escaneo[] = this.chipsTempCSV.map(chipId => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      chipId,
      puntoNombre: this.puntoActual.nombre,
      timestamp: new Date().toISOString()
    }));

    // Reemplazar datos antiguos en el servicio
    this.trazabilidadService.clearPointScans(this.lineaActiva.id, this.puntoActual.nombre);
    this.trazabilidadService.addBulkScans(this.lineaActiva.id, this.puntoActual.nombre, escaneos);

    // Actualizar modelo local
    this.puntoActual.chips = [...this.chipsTempCSV];
    this.puntoActual.totalLecturas = this.chipsTempCSV.length;

    // Limpiar UI temporal
    this.chipsTempCSV = [];
    this.archivoCSVNombre = '';

    alert(`✅ Datos guardados correctamente en ${this.puntoActual.nombre}`);
    this.cdr.detectChanges();
  }

  // ══════════════════════════════════════════════════════════════
  // COMPARATIVA
  // ══════════════════════════════════════════════════════════════

  generarComparativa(): void {
    this.perdidas = [];
    this.apariciones = [];

    for (let i = 1; i < this.puntos.length; i++) {
      const anterior = this.puntos[i - 1];
      const actual = this.puntos[i];

      const perdidos = anterior.chips.filter(c => !actual.chips.includes(c));
      if (perdidos.length > 0) {
        this.perdidas.push({ punto: `${anterior.nombre} → ${actual.nombre}`, chips: perdidos });
      }

      const nuevos = actual.chips.filter(c => !anterior.chips.includes(c));
      if (nuevos.length > 0) {
        this.apariciones.push({ punto: `${anterior.nombre} → ${actual.nombre}`, chips: nuevos });
      }
    }

    this.mostrarComparativa = true;
    this.cdr.detectChanges();
  }

  identificarModelo(epc: string): string {
    if (!this.catalogo.length) return 'Sin Catálogo';
    const match = this.catalogo.find(c => epc.toUpperCase().startsWith(c.prefijo));
    return match ? match.nombre : 'Desconocido';
  }

  get resumenModelos(): ModeloResumen[] {
    if (!this.puntoActual.chips.length) return [];

    const mapa = new Map<string, number>();
    for (const chip of this.puntoActual.chips) {
      const modelo = this.identificarModelo(chip);
      mapa.set(modelo, (mapa.get(modelo) || 0) + 1);
    }

    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  get totalChipsLinea(): number {
    // Suma de chips únicos en toda la línea (sin duplicados globales)
    const todos = new Set<string>();
    this.puntos.forEach(p => p.chips.forEach(c => todos.add(c)));
    return todos.size;
  }

// --- GETTERS PARA CÁLCULOS ---
  get totalPerdidasCount(): number {
    return this.perdidas.reduce((sum, p) => sum + p.chips.length, 0);
  }

  get totalAparicionesCount(): number {
    return this.apariciones.reduce((sum, a) => sum + a.chips.length, 0);
  }


  volver(): void {
    this.router.navigate(['/configuracion']);
  }
}