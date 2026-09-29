import { CanDeactivateFn } from '@angular/router';

export interface FormularioConCambios {
  puedeSalir(): boolean;
}

// El componente conoce su borrador; el router respeta su decisión de salida.
export const cambiosPendientesGuard: CanDeactivateFn<FormularioConCambios> =
  componente => componente.puedeSalir();
