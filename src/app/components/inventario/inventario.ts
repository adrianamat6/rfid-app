import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TrazabilidadService } from '../../services/trazabilidad.service';
import { SavedConfig } from '../../interfaces/rfid.models';

interface FilaComparativa {
  epc: string;
  modelo: string;
  presencia: Record<string, boolean>;
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css'
})
export class InventarioComponent implements OnInit {

  lineaActiva: SavedConfig | null = null;
  puntos: string[] = [];

  // Catálogo maestro
  catalogo: { prefijo: string; nombre: string }[] = [];
  catalogoNombre: string = '';

  // CSVs cargados por punto
  epcsPorPunto: Record<string, string[]> = {};
  csvNombres: Record<string, string> = {};

  // Tabla resultado
  filas: FilaComparativa[] = [];
  tablaGenerada: boolean = false;

  // Filtro
  filtroTexto: string = '';

  constructor(
    private router: Router,
    private trazabilidadService: TrazabilidadService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.lineaActiva = this.trazabilidadService.getActiveConfig();
    if (!this.lineaActiva) {
      this.router.navigate(['/configuracion']);
      return;
    }
    this.puntos = this.lineaActiva.locations;
    this.puntos.forEach(p => {
      this.epcsPorPunto[p] = [];
      this.csvNombres[p] = '';
    });
  }

  // ── CATÁLOGO ──
  onCatalogoSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.catalogoNombre = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      this.catalogo = text.split('\n')
        .map(linea => {
          const cols = linea.split(/[,;\t]/).map(c => c.replace(/['"]+/g, '').trim());
          return { prefijo: cols[0]?.toUpperCase(), nombre: cols[1] };
        })
        .filter(c => c.prefijo && c.prefijo.length > 3 && c.prefijo !== 'EPC' && !!c.nombre);
      this.tablaGenerada = false;
      this.cdr.detectChanges();
    };
    reader.readAsText(file, 'utf-8');
  }

  // ── CSV POR PUNTO ──
  onCSVPuntoSelected(e: Event, punto: string): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.csvNombres[punto] = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const epcs = Array.from(new Set(
        text.split('\n')
          .map(l => l.split(/[,;\t]/)[0].replace(/['"]+/g, '').trim().toUpperCase())
          .filter(epc => epc.length >= 6 && epc !== 'EPC')
      ));
      this.epcsPorPunto[punto] = epcs;
      this.tablaGenerada = false;
      this.cdr.detectChanges();
    };
    reader.readAsText(file, 'utf-8');
  }

  // ── IDENTIFICAR MODELO ──
  identificarModelo(epc: string): string | null {
    const match = this.catalogo.find(c => epc.startsWith(c.prefijo));
    return match ? match.nombre : null;
  }

  // ── GENERAR TABLA ──
  generarTabla(): void {
    // Recolectar todos los EPCs únicos de todos los puntos
    const todosEpcs = new Set<string>();
    this.puntos.forEach(p => {
      (this.epcsPorPunto[p] || []).forEach(epc => todosEpcs.add(epc));
    });

    // Construir filas solo para EPCs reconocidos en el catálogo
    const filasMap = new Map<string, FilaComparativa>();

    todosEpcs.forEach(epc => {
      const modelo = this.identificarModelo(epc);
      if (!modelo) return; // ignorar ruido

      const presencia: Record<string, boolean> = {};
      this.puntos.forEach(p => {
        presencia[p] = (this.epcsPorPunto[p] || []).includes(epc);
      });

      filasMap.set(epc, { epc, modelo, presencia });
    });

    // Ordenar por modelo
    this.filas = Array.from(filasMap.values())
      .sort((a, b) => a.modelo.localeCompare(b.modelo));

    this.tablaGenerada = true;
    this.cdr.detectChanges();
  }

  // ── FILTRO ──
  get filasFiltradas(): FilaComparativa[] {
    if (!this.filtroTexto.trim()) return this.filas;
    const f = this.filtroTexto.toLowerCase();
    return this.filas.filter(r =>
      r.modelo.toLowerCase().includes(f) || r.epc.toLowerCase().includes(f)
    );
  }

  // ── STATS ──
  get totalArticulos(): number { return this.filas.length; }

  get articulosCompletos(): number {
    return this.filas.filter(f => this.puntos.every(p => f.presencia[p])).length;
  }

  get articulosConPerdida(): number {
    return this.filas.filter(f => !this.puntos.every(p => f.presencia[p])).length;
  }

  get todosCSVCargados(): boolean {
    return this.puntos.length > 0 && this.puntos.every(p => this.epcsPorPunto[p]?.length > 0);
  }

  get puntosConCSV(): number {
    return this.puntos.filter(p => this.epcsPorPunto[p]?.length > 0).length;
  }

  presenciaTotal(fila: FilaComparativa): number {
    return this.puntos.filter(p => fila.presencia[p]).length;
  }

  volver(): void { this.router.navigate(['/configuracion']); }
}