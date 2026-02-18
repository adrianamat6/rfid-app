import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Escaneo } from '../../interfaces/rfid.models';


@Component({
  selector: 'app-operario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './operario.html',
  styleUrl: './operario.css'
})
export class OperarioComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('scanInput') scanInput!: ElementRef;

  puntosLinea: any[] = [];
  puntoSeleccionado: any = null;
  inputScan: string = '';
  escaneos: Escaneo[] = [];
  
  private ultimoChipLeido: string = '';
  private ultimoTimeLeido: number = 0;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
    this.cargarHistorial();
  }

  ngAfterViewInit() {
    this.mantenerFoco();
  }

  ngOnDestroy() {}

  private cargarConfiguracion() {
    const stored = localStorage.getItem('trazabilidad_configs');
    if (stored) {
      const configs = JSON.parse(stored);
      if (configs.length > 0) {
        this.puntosLinea = configs[0].locations.map((l: string, i: number) => ({ id: i, nombre: l }));
        this.puntoSeleccionado = this.puntosLinea[0];
      }
    }
  }

  private cargarHistorial() {
    const stored = localStorage.getItem('trazabilidad_escaneos');
    if (stored) this.escaneos = JSON.parse(stored);
  }

  // DETECTA LA PDA EN TIEMPO REAL
  onInputChange(value: string) {
    // Si la PDA mete más de 6 caracteres (longitud típica mínima de chip/EAN)
    if (value.length >= 6) { 
      this.procesarDato(value.trim());
    }
  }

  procesarDato(rawId: string) {
    if (!rawId) return;

    // EVITAR DUPLICADOS POR REBOTE (1.5 segundos de margen)
    const ahora = Date.now();
    if (rawId === this.ultimoChipLeido && (ahora - this.ultimoTimeLeido) < 1500) {
      this.inputScan = ''; // Limpiamos pero no guardamos
      return;
    }

    const nuevo: Escaneo = {
      id: ahora.toString() + Math.random().toString(36).substr(2, 4),
      chipId: rawId,
      puntoNombre: this.puntoSeleccionado?.nombre || 'General',
      timestamp: new Date().toISOString()
    };

    // Actualizamos lista y estado
    this.escaneos = [nuevo, ...this.escaneos];
    this.ultimoChipLeido = rawId;
    this.ultimoTimeLeido = ahora;

    // GUARDADO Y LIMPIEZA ABSOLUTA
    localStorage.setItem('trazabilidad_escaneos', JSON.stringify(this.escaneos));
    
    // Limpiamos el modelo y el elemento DOM directamente para asegurar
    this.inputScan = ''; 
    if (this.scanInput) {
      this.scanInput.nativeElement.value = '';
    }
    
    this.mantenerFoco();
  }

  mantenerFoco() {
    setTimeout(() => {
      if (this.scanInput) this.scanInput.nativeElement.focus();
    }, 10);
  }

  seleccionarPunto(p: any) {
    this.puntoSeleccionado = p;
    this.mantenerFoco();
  }

  limpiarHistorial() {
    if (confirm('¿Vaciar todos los registros del inventario actual?')) {
      this.escaneos = [];
      localStorage.removeItem('trazabilidad_escaneos');
      this.ultimoChipLeido = '';
      this.mantenerFoco();
    }
  }

  formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  volver() { this.router.navigate(['/configuracion']); }
}