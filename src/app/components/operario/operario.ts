import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Escaneo, SavedConfig } from '../../interfaces/rfid.models';
import { TrazabilidadService } from '../../services/trazabilidad.service';

@Component({
  selector: 'app-operario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './operario.html',
  styleUrl: './operario.css'
})
export class OperarioComponent implements OnInit, AfterViewInit {
  @ViewChild('scanInput') scanInput!: ElementRef;

  activa: SavedConfig | null = null;
  puntosLinea: any[] = [];
  puntoSeleccionado: any = null;
  inputScan: string = '';
  escaneos: Escaneo[] = [];

  constructor(
    private router: Router, 
    private trazabilidadService: TrazabilidadService
  ) {}

  ngOnInit(): void {
    this.activa = this.trazabilidadService.getActiveConfig();
    if (this.activa) {
      this.puntosLinea = this.activa.locations.map((l, i) => ({ id: i, nombre: l }));
      this.seleccionarPunto(this.puntosLinea[0]);
    }
  }

  ngAfterViewInit() { this.mantenerFoco(); }

  seleccionarPunto(p: any) {
    this.puntoSeleccionado = p;
    if (this.activa) {
      this.escaneos = this.trazabilidadService.getScansForPoint(this.activa.id, p.nombre);
    }
    this.mantenerFoco();
  }

  onInputChange(value: string) {
    if (value.length >= 6) this.procesarDato(value.trim());
  }

  procesarDato(rawId: string) {
    if (!rawId || !this.activa || !this.puntoSeleccionado) return;

    const nuevo: Escaneo = {
      id: Date.now().toString(),
      chipId: rawId,
      puntoNombre: this.puntoSeleccionado.nombre,
      timestamp: new Date().toISOString()
    };

    this.trazabilidadService.addScan(this.activa.id, this.puntoSeleccionado.nombre, nuevo);
    this.escaneos = [nuevo, ...this.escaneos];
    this.inputScan = '';
    this.mantenerFoco();
  }

  mantenerFoco() {
    setTimeout(() => this.scanInput?.nativeElement.focus(), 50);
  }

  formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString('es-ES');
  }

  limpiarHistorial() {
    if (confirm('¿Borrar escaneos de este punto?')) {
      this.escaneos = [];
      // Aquí podrías añadir un método clearPointScans al servicio
    }
  }

  volver() { this.router.navigate(['/configuracion']); }
}