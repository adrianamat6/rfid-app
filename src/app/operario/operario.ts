import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; // 👈

export interface Escaneo {
  id: string;
  chipId: string;
  puntoId: string;
  puntoNombre: string;
  timestamp: string;
}

export interface PuntoLinea {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-operario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './operario.html',
  styleUrl: './operario.css'
})
export class OperarioComponent implements OnInit, OnDestroy {

  constructor(private router: Router) {} 

  // ── LÍNEA CONFIGURADA ──
  puntosLinea: PuntoLinea[] = [];
  puntoSeleccionado: PuntoLinea | null = null;

  // ── ESCANEO ──
  inputScan: string = '';
  escaneos: Escaneo[] = [];

  // ── FEEDBACK VISUAL ──
  ultimoEscaneo: Escaneo | null = null;
  flashVisible: boolean = false;
  private flashTimer: any;

  // ── STATS ──
  get totalEscaneos(): number {
    return this.escaneos.length;
  }

  get escaneosPuntoActual(): number {
    if (!this.puntoSeleccionado) return 0;
    return this.escaneos.filter(e => e.puntoId === this.puntoSeleccionado!.id).length;
  }

  get ultimaHora(): string {
    if (!this.ultimoEscaneo) return '--:--';
    return new Date(this.ultimoEscaneo.timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  // ── LIFECYCLE ──
  ngOnInit(): void {
    this.cargarPuntosDeLinea();
    this.cargarEscaneos();
  }

  ngOnDestroy(): void {
    clearTimeout(this.flashTimer);
  }

  // ── CARGAR LÍNEA CONFIGURADA ──
  private cargarPuntosDeLinea(): void {
    // Lee las configuraciones guardadas por TrazabilidadComponent
    const stored = localStorage.getItem('trazabilidad_configs');
    if (!stored) return;

    const configs = JSON.parse(stored);
    if (configs.length === 0) return;

    // Usa la primera configuración activa (o la más reciente)
    const config = configs[0];
    this.puntosLinea = config.locations.map((nombre: string, i: number) => ({
      id: `punto-${i}`,
      nombre
    }));

    // Autoselecciona el primero
    if (this.puntosLinea.length > 0) {
      this.puntoSeleccionado = this.puntosLinea[0];
    }
  }

  // ── CARGAR ESCANEOS PREVIOS ──
  private cargarEscaneos(): void {
    const stored = localStorage.getItem('trazabilidad_escaneos');
    if (stored) {
      this.escaneos = JSON.parse(stored);
      if (this.escaneos.length > 0) {
        this.ultimoEscaneo = this.escaneos[this.escaneos.length - 1];
      }
    }
  }

  // ── SELECCIONAR PUNTO ──
  seleccionarPunto(punto: PuntoLinea): void {
    this.puntoSeleccionado = punto;
  }

  // ── REGISTRAR ESCANEO (llamado por Enter de la PDA) ──
  registrarEscaneo(): void {
    const chip = this.inputScan.trim();
    if (!chip || !this.puntoSeleccionado) return;

    const nuevoEscaneo: Escaneo = {
      id: Date.now().toString(),
      chipId: chip,
      puntoId: this.puntoSeleccionado.id,
      puntoNombre: this.puntoSeleccionado.nombre,
      timestamp: new Date().toISOString()
    };

    // Añadir al array (los más recientes primero)
    this.escaneos = [nuevoEscaneo, ...this.escaneos];
    this.ultimoEscaneo = nuevoEscaneo;

    // Guardar en localStorage
    localStorage.setItem('trazabilidad_escaneos', JSON.stringify(this.escaneos));

    // Limpiar input
    this.inputScan = '';

    // Flash de confirmación
    this.triggerFlash();
  }

  // ── LIMPIAR HISTORIAL ──
  limpiarHistorial(): void {
    this.escaneos = [];
    this.ultimoEscaneo = null;
    localStorage.removeItem('trazabilidad_escaneos');
  }

  // ── FLASH VISUAL ──
  private triggerFlash(): void {
    this.flashVisible = true;
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => {
      this.flashVisible = false;
    }, 600);
  }

  // ── HELPERS ──
  formatHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short'
    });
  }

  trackById(_: number, item: any): string {
    return item.id;
  }

  volver(): void {
    this.router.navigate(['/configuracion']);
  }
}