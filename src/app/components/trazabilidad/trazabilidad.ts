import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SavedConfig } from '../../interfaces/rfid.models';
import { TrazabilidadService } from '../../services/trazabilidad.service';

@Component({
  selector: 'app-trazabilidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './trazabilidad.html',
  styleUrl: './trazabilidad.css'
})
export class TrazabilidadComponent implements OnInit {
  locations: string[] = [];
  inputLocation: string = '';
  savedConfigs: SavedConfig[] = [];
  activeConfigId: string | null = null;
  showModal: boolean = false;
  configNameInput: string = '';

  toastMessage: string = '';
  toastType: 'success' | 'danger' | '' = '';
  toastVisible: boolean = false;

  constructor(private trazabilidadService: TrazabilidadService) {}

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData() {
    this.savedConfigs = this.trazabilidadService.getConfigs();
    const active = this.trazabilidadService.getActiveConfig();
    if (active) {
      this.activeConfigId = active.id;
      this.locations = active.locations;
    }
  }

  addLocation(): void {
    if (!this.inputLocation.trim()) return;
    this.locations = [...this.locations, this.inputLocation.trim()];
    this.inputLocation = '';
  }

  removeLocation(index: number): void {
    this.locations = this.locations.filter((_, i) => i !== index);
  }

  saveConfig(): void {
    const name = this.configNameInput.trim();
    if (!name) return;

    const config: SavedConfig = {
      id: this.activeConfigId || Date.now().toString(),
      name,
      locations: [...this.locations],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.trazabilidadService.saveConfig(config);
    this.trazabilidadService.setActiveConfigId(config.id);
    this.activeConfigId = config.id;
    
    this.showToast('success', '✓ Línea guardada y activada');
    this.closeModal();
    this.refreshData();
  }

  loadConfig(id: string): void {
    this.trazabilidadService.setActiveConfigId(id);
    this.showToast('success', '↓ Línea cargada como activa');
    this.refreshData();
  }

  clearAll(): void {
    this.locations = [];
    this.activeConfigId = null;
    this.trazabilidadService.setActiveConfigId(null);
  }

  // --- UI HELPERS ---
  openSaveModal(): void { this.showModal = true; }
  closeModal(): void { this.showModal = false; }
  get isActive() { return this.locations.length > 0; }
  get canSave() { return this.locations.length > 0; }
  get connectionsCount() { return Math.max(0, this.locations.length - 1); }

  showToast(type: 'success' | 'danger' | '', message: string): void {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    setTimeout(() => this.toastVisible = false, 2500);
  }
}