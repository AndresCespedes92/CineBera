import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { OverlayContainer } from '@angular/cdk/overlay';
import { firstValueFrom } from 'rxjs';
import { ConfirmarSalida } from '../app/components/confirmar-salida/confirmar-salida';
import { PasosCompra } from '../app/components/pasos-compra/pasos-compra';

it('el diálogo real conserva el borrador al elegir seguir editando', async () => {
  TestBed.configureTestingModule({ imports: [ConfirmarSalida] });
  const ref = TestBed.inject(MatDialog).open(ConfirmarSalida);
  const resultado = firstValueFrom(ref.afterClosed());
  await new Promise((resolve) => setTimeout(resolve, 50));
  const overlay = TestBed.inject(OverlayContainer).getContainerElement();
  const botones = Array.from(overlay.querySelectorAll('button'));
  (botones.find((b) => b.textContent?.includes('Seguir editando')) as HTMLButtonElement).click();
  expect(await resultado).toBe(false);
});
it('el diálogo real devuelve descarte explícito', async () => {
  TestBed.configureTestingModule({ imports: [ConfirmarSalida] });
  const ref = TestBed.inject(MatDialog).open(ConfirmarSalida);
  const resultado = firstValueFrom(ref.afterClosed());
  await new Promise((resolve) => setTimeout(resolve, 50));
  const overlay = TestBed.inject(OverlayContainer).getContainerElement();
  (
    Array.from(overlay.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Descartar cambios'),
    ) as HTMLButtonElement
  ).click();
  expect(await resultado).toBe(true);
});
it('los pasos identifican el actual sin permitir saltar validaciones', () => {
  const fixture = TestBed.createComponent(PasosCompra);
  fixture.componentRef.setInput('paso', 2);
  fixture.componentRef.setInput('candy', true);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('[aria-current=step]').textContent).toContain(
    'Resumen',
  );
  expect(fixture.nativeElement.querySelectorAll('a,button').length).toBe(0);
  expect(fixture.nativeElement.textContent).toContain('Volvé al resumen');
});
