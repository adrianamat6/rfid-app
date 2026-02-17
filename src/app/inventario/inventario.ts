import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css'
})
export class InventarioComponent implements OnInit {

  // --- ESTADO ---
  archivoLecturasNombre: string = '';
  chipsLeidosBruto: any[] = [];

  archivoCatalogoNombre: string = '';
  catalogo: any[] = [];

  resultadosChips: ChipResultado[] = [];
  resumenModelos: ModeloResumen[] = [];

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    console.log("Inventario listo.");
  }

  // --- UTILIDAD DE LIMPIEZA ---
  private limpiarTexto(texto: string): string {
    if (!texto) return '';
    // Quita comillas dobles, simples, espacios y caracteres invisibles
    return texto.replace(/['"]+/g, '').trim();
  }

  // --- PARSEADOR UNIVERSAL (Sirve para PDA y Maestro) ---
  private parsearCSVUniversal(text: string): string[][] {
    const lineas = text.split(/\r?\n/).filter(l => l.trim());
    if (lineas.length === 0) return [];

    // Detectar separador mirando la primera línea
    const primeraLinea = lineas[0];
    let separador = ',';
    if (primeraLinea.includes(';')) separador = ';';
    else if (primeraLinea.includes('\t')) separador = '\t';

    return lineas.map(linea => {
      // Divide y limpia cada columna
      return linea.split(separador).map(col => this.limpiarTexto(col));
    });
  }

  // --- 1. CARGA PDA (Lecturas) ---
  onLecturasSelected(e: any) {
    const file = e.target.files[0];
    if (!file) return;
    
    this.archivoLecturasNombre = file.name;
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      const filas = this.parsearCSVUniversal(ev.target.result);
      
      this.chipsLeidosBruto = filas.map(cols => {
        // Asumimos formato: EPC, TID, COUNT, RSSI
        // Si hay menos columnas, intentamos coger lo que haya
        return {
          epc: cols[0] || '',
          count: parseInt(cols[2]) || 1,
          rssi: cols[3] || '0'
        };
      }).filter(item => item.epc !== '' && item.epc.toUpperCase() !== 'EPC'); // Quitar cabecera y vacíos

      this.cdr.detectChanges();
    };
    reader.readAsText(file, 'utf-8');
  }

  // --- 2. CARGA CATÁLOGO (Maestro) ---
  onCatalogoSelected(e: any) {
    const file = e.target.files[0];
    if (!file) return;

    this.archivoCatalogoNombre = file.name;
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      const filas = this.parsearCSVUniversal(ev.target.result);

      this.catalogo = filas.map(cols => {
        // Asumimos formato: EPC (Prefijo), NOMBRE MODELO
        return {
          prefijo: (cols[0] || '').toUpperCase(),
          nombre: cols[1] || 'Sin nombre'
        };
      }).filter(item => item.prefijo !== '' && item.prefijo !== 'EPC'); // Quitar cabecera

      console.log("Catálogo cargado:", this.catalogo); // Para depurar si hace falta
      this.cdr.detectChanges();
    };
    reader.readAsText(file, 'utf-8');
  }

  // --- 3. PROCESAR ---
  procesarAnalisis() {
    const mapaModelos = new Map<string, number>();
    
    this.resultadosChips = this.chipsLeidosBruto.map(chip => {
      let modeloEncontrado = 'Desconocido';
      const epcUpper = chip.epc.toUpperCase();

      // Buscamos coincidencia
      // 1. Coincidencia exacta
      // 2. O si el chip empieza por el código del catálogo
      const match = this.catalogo.find(item => 
        epcUpper === item.prefijo || epcUpper.startsWith(item.prefijo)
      );

      if (match) {
        modeloEncontrado = match.nombre;
      }

      // Contar para el resumen
      const actual = mapaModelos.get(modeloEncontrado) || 0;
      mapaModelos.set(modeloEncontrado, actual + 1);

      return {
        epc: chip.epc,
        count: chip.count,
        rssi: chip.rssi,
        modelo: modeloEncontrado
      };
    });

    // Crear array de resumen ordenado por cantidad
    this.resumenModelos = Array.from(mapaModelos.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    this.cdr.detectChanges();
  }

  resetear() {
    this.archivoLecturasNombre = '';
    this.archivoCatalogoNombre = '';
    this.chipsLeidosBruto = [];
    this.catalogo = [];
    this.resultadosChips = [];
    this.resumenModelos = [];
  }

  volver() {
    this.router.navigate(['/configuracion']);
  }
}