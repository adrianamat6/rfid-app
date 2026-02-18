import { Routes } from '@angular/router';

// Actualiza estas líneas con la nueva ubicación dentro de 'components':
import { TrazabilidadComponent } from './components/trazabilidad/trazabilidad';
import { OperarioComponent } from './components/operario/operario';
import { InventarioComponent } from './components/inventario/inventario';

export const routes: Routes = [
  { path: '', redirectTo: 'configuracion', pathMatch: 'full' },
  { path: 'configuracion', component: TrazabilidadComponent },
  { path: 'operario', component: OperarioComponent },
  { path: 'inventario', component: InventarioComponent },

];