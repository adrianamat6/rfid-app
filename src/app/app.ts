import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TrazabilidadComponent } from './components/trazabilidad/trazabilidad';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,TrazabilidadComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('rfid-app');
}
