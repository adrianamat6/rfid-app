import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TrazabilidadService } from '../../services/trazabilidad.service';
import { SavedConfig } from '../../interfaces/rfid.models';

interface FilaArticulo {
  epc: string;
  modelo: string;
  serial: string;
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

  catalogo: { prefijo: string; nombre: string }[] = [];
  catalogoNombre: string = '';

  epcsPorPunto: Record<string, string[]> = {};
  csvNombres: Record<string, string> = {};

  filas: FilaArticulo[] = [];
  tablaGenerada: boolean = false;
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

  onCSVPuntoSelected(e: Event, punto: string): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.csvNombres[punto] = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // Cada línea es un chip físico único. Usamos Set para evitar duplicados
      // (misma antena leyendo el mismo chip dos veces en la misma sesión)
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

  generarTabla(): void {
    // Recogemos TODOS los EPCs únicos vistos en cualquier punto
    const todosEpcsSet = new Set<string>();
    this.puntos.forEach(p => {
      (this.epcsPorPunto[p] || []).forEach(epc => todosEpcsSet.add(epc));
    });

    const nuevasFilas: FilaArticulo[] = [];

    todosEpcsSet.forEach(epc => {
      // Buscamos el prefijo más largo que coincida (para evitar colisiones de prefijos)
      const match = this.catalogo
        .filter(c => epc.startsWith(c.prefijo))
        .sort((a, b) => b.prefijo.length - a.prefijo.length)[0];

      // El serial es todo lo que viene DESPUÉS del prefijo del modelo
      const serial = match ? epc.substring(match.prefijo.length) : epc;
      const modelo = match ? match.nombre : 'DESCONOCIDO';

      // Para cada punto: ¿estaba este EPC concreto en su lista?
      const presencia: Record<string, boolean> = {};
      this.puntos.forEach(p => {
        presencia[p] = (this.epcsPorPunto[p] || []).includes(epc);
      });

      nuevasFilas.push({
        epc,
        modelo,
        serial: serial || epc,
        presencia
      });
    });

    // Descomenta la siguiente línea para ELIMINAR los chips sin modelo del catálogo:
    // nuevasFilas = nuevasFilas.filter(f => f.modelo !== 'DESCONOCIDO');

    // Ordenamos: conocidos primero, desconocidos al final
    // Dentro de cada grupo: por modelo, luego por serial (orden natural)
    this.filas = nuevasFilas.sort((a, b) => {
      const aDesconocido = a.modelo === 'DESCONOCIDO';
      const bDesconocido = b.modelo === 'DESCONOCIDO';
      if (aDesconocido !== bDesconocido) return aDesconocido ? 1 : -1;
      const cmpMod = a.modelo.localeCompare(b.modelo);
      if (cmpMod !== 0) return cmpMod;
      return a.serial.localeCompare(b.serial, undefined, { numeric: true });
    });

    this.tablaGenerada = true;
    this.cdr.detectChanges();
  }

  // ── GETTERS ──

  get filasFiltradas(): FilaArticulo[] {
    if (!this.filtroTexto.trim()) return this.filas;
    const f = this.filtroTexto.toLowerCase();
    return this.filas.filter(r =>
      r.modelo.toLowerCase().includes(f) ||
      r.epc.toLowerCase().includes(f) ||
      r.serial.toLowerCase().includes(f)
    );
  }

  get totalArticulos(): number { return this.filas.length; }

  get articulosCompletos(): number {
    return this.filas.filter(f => this.puntos.every(p => f.presencia[p])).length;
  }

  get articulosParciales(): number {
    return this.filas.filter(f =>
      this.puntos.some(p => f.presencia[p]) && !this.puntos.every(p => f.presencia[p])
    ).length;
  }

  get articulosSoloPrimerPunto(): number {
    if (this.puntos.length === 0) return 0;
    return this.filas.filter(f => f.presencia[this.puntos[0]] && !this.puntos.slice(1).every(p => f.presencia[p])).length;
  }

  get puntosConCSV(): number {
    return this.puntos.filter(p => (this.epcsPorPunto[p]?.length ?? 0) > 0).length;
  }

  presenciaTotal(fila: FilaArticulo): number {
    return this.puntos.filter(p => fila.presencia[p]).length;
  }

  volver(): void { this.router.navigate(['/configuracion']); }
}