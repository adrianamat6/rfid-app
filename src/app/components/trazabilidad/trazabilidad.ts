import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router'; // 👈

export interface SavedConfig {
  id: string;
  name: string;
  locations: string[];
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-trazabilidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './trazabilidad.html',
  styleUrl: './trazabilidad.css'
})
export class TrazabilidadComponent implements OnInit {

  // ── ESTADO PRINCIPAL ──
  locations: string[] = [];
  inputLocation: string = '';
  hasUnsavedChanges: boolean = false;

  // ── CONFIGURACIONES GUARDADAS ──
  savedConfigs: SavedConfig[] = [];
  activeConfigId: string | null = null;

  // ── MODAL ──
  showModal: boolean = false;
  configNameInput: string = '';
  configNameError: boolean = false;

  // ── TOAST ──
  toastMessage: string = '';
  toastType: 'success' | 'danger' | '' = '';
  toastVisible: boolean = false;
  private toastTimer: any;

  // ── LIFECYCLE ──
  ngOnInit(): void {
    const stored = localStorage.getItem('trazabilidad_configs');
    if (stored) {
      this.savedConfigs = JSON.parse(stored);
    }
  }

  // ── GETTERS ──
  get connectionsCount(): number {
    return Math.max(0, this.locations.length - 1);
  }

  get isActive(): boolean {
    return this.locations.length > 0;
  }

  get canSave(): boolean {
    return this.locations.length > 0;
  }

  // ── GESTIÓN DE PUNTOS ──
  addLocation(): void {
    if (!this.inputLocation.trim()) return;
    this.locations = [...this.locations, this.inputLocation.trim()];
    this.inputLocation = '';
    this.hasUnsavedChanges = true;
  }

  removeLocation(index: number): void {
    this.locations = this.locations.filter((_, i) => i !== index);
    this.hasUnsavedChanges = true;
  }

  clearAll(): void {
    this.locations = [];
    this.activeConfigId = null;
    this.hasUnsavedChanges = false;
  }

  // ── MODAL ──
  openSaveModal(): void {
    if (!this.canSave) return;
    this.configNameError = false;
    const existing = this.savedConfigs.find(c => c.id === this.activeConfigId);
    this.configNameInput = existing ? existing.name : '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.configNameError = false;
  }

  // ── GUARDAR ──
  saveConfig(): void {
    const name = this.configNameInput.trim();
    if (!name) {
      this.configNameError = true;
      return;
    }

    if (this.activeConfigId) {
      this.savedConfigs = this.savedConfigs.map(c =>
        c.id === this.activeConfigId
          ? { ...c, name, locations: [...this.locations], updatedAt: new Date().toISOString() }
          : c
      );
      this.showToast('success', '✓ Configuración actualizada');
    } else {
      const newConfig: SavedConfig = {
        id: Date.now().toString(),
        name,
        locations: [...this.locations],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.savedConfigs = [newConfig, ...this.savedConfigs];
      this.activeConfigId = newConfig.id;
      this.showToast('success', '✓ Configuración guardada');
    }

    localStorage.setItem('trazabilidad_configs', JSON.stringify(this.savedConfigs));
    this.hasUnsavedChanges = false;
    this.closeModal();
  }

  // ── CARGAR ──
  loadConfig(id: string): void {
    const cfg = this.savedConfigs.find(c => c.id === id);
    if (!cfg) return;
    this.locations = [...cfg.locations];
    this.activeConfigId = id;
    this.hasUnsavedChanges = false;
    this.showToast('', `↓ Cargado: ${cfg.name}`);
  }

  // ── ELIMINAR CONFIG ──
  deleteConfig(event: Event, id: string): void {
    event.stopPropagation();
    this.savedConfigs = this.savedConfigs.filter(c => c.id !== id);
    if (this.activeConfigId === id) this.activeConfigId = null;
    localStorage.setItem('trazabilidad_configs', JSON.stringify(this.savedConfigs));
    this.showToast('danger', '🗑 Configuración eliminada');
  }

  // ── TOAST ──
  showToast(type: 'success' | 'danger' | '', message: string): void {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 2800);
  }

  // ── HELPERS ──
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  padIndex(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackById(_: number, cfg: SavedConfig): string {
    return cfg.id;
  }
}