import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

export interface ChipResultado {
  epc: string;
  tid: string;
  count: number;
  rssi: string;
  rssiNum: number;
}

export interface PuntoLinea {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css'
})
export class InventarioComponent implements OnInit {

  puntosLinea: PuntoLinea[] = [];
  puntoSeleccionado: PuntoLinea | null = null;
  archivoNombre: string = '';
  chipsCargados: ChipResultado[] = []; 
  dragging: boolean = false;
  resultados: ChipResultado[] = []; 

  filtroEpc: string = '';
  soloMultiples: boolean = false;
  sortCol: string = 'count';
  sortAsc: boolean = false;

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarLineaConfigurada();
  }

  private cargarLineaConfigurada(): void {
    const stored = localStorage.getItem('trazabilidad_configs');
    if (stored) {
      const configs = JSON.parse(stored);
      if (configs.length > 0) {
        this.puntosLinea = configs[0].locations.map((nombre: string, i: number) => ({
          id: i, nombre: nombre
        }));
        if (this.puntosLinea.length > 0) this.puntoSeleccionado = this.puntosLinea[0];
      }
    }
  }

  seleccionarPunto(p: PuntoLinea): void {
    this.puntoSeleccionado = p;
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging = true;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.procesarLecturaArchivo(file);
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.procesarLecturaArchivo(file);
  }

  private procesarLecturaArchivo(file: File): void {
    this.archivoNombre = file.name;
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      const text = e.target.result;
      console.log("Archivo leído, iniciando proceso...");
      
      const procesados = this.parsearCSVSuperRobusto(text);
      
      // IMPORTANTE: Asignamos y forzamos a Angular a que se entere del cambio
      this.chipsCargados = [...procesados];
      console.log("Total chips cargados:", this.chipsCargados.length);
      console.table(this.chipsCargados.slice(0, 5)); // Ver los primeros 5 en consola
      
      this.cdr.detectChanges(); 
    };
    reader.readAsText(file, 'utf-8');
  }

  /**
   * PARSEADOR PASO A PASO
   * Ignora las comas que están dentro de comillas y limpia todo.
   */
  private parsearCSVSuperRobusto(text: string): ChipResultado[] {
    const lineas = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const listaFinal: ChipResultado[] = [];

    for (let i = 0; i < lineas.length; i++) {
      let linea = lineas[i];

      // Saltamos la cabecera si contiene la palabra EPC
      if (linea.toUpperCase().includes('EPC')) continue;

      // Separamos por comas manualmente respetando comillas
      const columnas: string[] = [];
      let campoActual = '';
      let enComillas = false;

      for (let char of linea) {
        if (char === '"') {
          enComillas = !enComillas;
        } else if (char === ',' && !enComillas) {
          columnas.push(campoActual.trim());
          campoActual = '';
        } else {
          campoActual += char;
        }
      }
      columnas.push(campoActual.trim()); // Añadir la última columna (RSSI)

      if (columnas.length >= 4) {
        const epc = columnas[0].replace(/"/g, ''); // Por si acaso tuviera comillas
        const tid = columnas[1].replace(/"/g, '');
        const count = parseInt(columnas[2].replace(/"/g, '')) || 1;
        
        // El RSSI en tu imagen es "-54,60". JS solo entiende puntos decimales.
        const rssiTexto = columnas[3].replace(/"/g, '').replace(',', '.');
        const rssiNum = parseFloat(rssiTexto) || -99;

        listaFinal.push({
          epc: epc,
          tid: tid,
          count: count,
          rssi: rssiTexto,
          rssiNum: rssiNum
        });
      }
    }
    return listaFinal;
  }

  procesarInventario(): void {
    if (this.chipsCargados.length === 0) return;

    const mapa = new Map<string, ChipResultado>();

    this.chipsCargados.forEach(chip => {
      if (mapa.has(chip.epc)) {
        const existente = mapa.get(chip.epc)!;
        existente.count += chip.count;
        if (chip.rssiNum > existente.rssiNum) {
          existente.rssi = chip.rssi;
          existente.rssiNum = chip.rssiNum;
        }
      } else {
        mapa.set(chip.epc, { ...chip });
      }
    });

    this.resultados = Array.from(mapa.values());
    this.ordenarPor('count');
    this.cdr.detectChanges();
  }

  // ── RESTO DE MÉTODOS (IGUALES) ──
  get rssiPromedio(): string {
    if (!this.resultados.length) return '0';
    const sum = this.resultados.reduce((acc, r) => acc + r.rssiNum, 0);
    return (sum / this.resultados.length).toFixed(1);
  }

  get resultadosFiltrados(): ChipResultado[] {
    let lista = [...this.resultados];
    if (this.filtroEpc) lista = lista.filter(r => r.epc.toLowerCase().includes(this.filtroEpc.toLowerCase()));
    if (this.soloMultiples) lista = lista.filter(r => r.count > 1);
    lista.sort((a, b) => {
      let valA: any = a[this.sortCol as keyof ChipResultado];
      let valB: any = b[this.sortCol as keyof ChipResultado];
      if (this.sortCol === 'rssi') { valA = a.rssiNum; valB = b.rssiNum; }
      return this.sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
    return lista;
  }

  ordenarPor(col: string): void {
    if (this.sortCol === col) this.sortAsc = !this.sortAsc; 
    else { this.sortCol = col; this.sortAsc = false; }
  }

  getSignalWidth(rssi: number): number {
    const width = ((rssi + 90) / 60) * 100;
    return Math.max(10, Math.min(100, width));
  }

  exportarCSV(): void {
    const encabezado = 'EPC;LECTURAS;RSSI;PUNTO_CONTROL;FECHA\n';
    const filas = this.resultados.map(r => `"${r.epc}";"${r.count}";"${r.rssi}";"${this.puntoSeleccionado?.nombre}";"${new Date().toLocaleString()}"`).join('\n');
    const blob = new Blob([encabezado + filas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.setAttribute('download', `inventario.csv`); link.click();
  }

  resetear(): void {
    this.resultados = []; this.chipsCargados = []; this.archivoNombre = ''; this.filtroEpc = '';
    this.cdr.detectChanges();
  }

  volver(): void { this.router.navigate(['/configuracion']); }
}