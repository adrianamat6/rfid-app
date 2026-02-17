import { Routes } from '@angular/router';
import { TrazabilidadComponent } from './components/trazabilidad/trazabilidad';
import { OperarioComponent } from './operario/operario';
import { InventarioComponent } from './inventario/inventario';

export const routes: Routes = [
  { path: '', redirectTo: 'configuracion', pathMatch: 'full' },
  { path: 'configuracion', component: TrazabilidadComponent },
  { path: 'operario', component: OperarioComponent },
  { path: 'inventario', component: InventarioComponent } // <--- AÑADIR ESTA LÍNEA

];