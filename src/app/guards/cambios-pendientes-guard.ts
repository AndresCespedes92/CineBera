import { Observable } from 'rxjs';
import { CanDeactivateFn } from '@angular/router';

export interface FormularioConCambios {
  puedeSalir(): boolean | Observable<boolean>;
}

// El componente conoce su borrador; el router respeta su decisión de salida.
export const cambiosPendientesGuard: CanDeactivateFn<FormularioConCambios> =
  componente => componente.puedeSalir();
