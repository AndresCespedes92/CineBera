import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Combos } from '../app/pages/admin/combos/combos';
import { ComboService } from '../app/services/combo';
import { cambiosPendientesGuard } from '../app/guards/cambios-pendientes-guard';
import { routes } from '../app/app.routes';

@Component({ template: 'Destino' })
class Destino {}
const combo = { id: 1, nombre: 'Clásico', precio: 100, pochoclo_id: 2, bebida_id: 3, activo: true };
let service: { obtenerTodos: ReturnType<typeof vi.fn>; obtenerProductos: ReturnType<typeof vi.fn>; guardar: ReturnType<typeof vi.fn> };
let pantalla: Combos;
let aceptar = false;
let dialog: { open: ReturnType<typeof vi.fn> };
beforeEach(() => {
  service = { obtenerTodos: vi.fn().mockResolvedValue([]), obtenerProductos: vi.fn().mockResolvedValue([]), guardar: vi.fn().mockResolvedValue(undefined) };
  aceptar = false;
  dialog = { open: vi.fn().mockImplementation(() => ({ afterClosed: () => of(aceptar) })) };
  pantalla = new Combos(service as unknown as ComboService, dialog as unknown as MatDialog);
});
afterEach(() => vi.restoreAllMocks());

it('registra el guard en la ruta real de combos', () => {
  expect(routes.find(r => r.path === 'admin')?.children?.find(r => r.path === 'combos')?.canDeactivate).toContain(cambiosPendientesGuard);
});
it('no pregunta en alta limpia ni al cargar una edición', () => {
  const confirmar = dialog.open;
  expect(pantalla.puedeSalir()).toBe(true);
  pantalla.editar(combo);
  expect(pantalla.puedeSalir()).toBe(true);
  expect(confirmar).not.toHaveBeenCalled();
});
it('restaurar el valor original elimina los cambios pendientes', () => {
  pantalla.editar(combo);
  pantalla.formulario.precio = 200;
  expect(pantalla.hayCambios()).toBe(true);
  pantalla.formulario.precio = 100;
  expect(pantalla.hayCambios()).toBe(false);
});
it('cancelar o seleccionar otro combo conserva el borrador si se rechaza', () => {
  aceptar = false;
  pantalla.formulario.nombre = 'Borrador';
  pantalla.cancelar(); pantalla.editar(combo);
  expect(pantalla.formulario.nombre).toBe('Borrador');
  expect(pantalla.editandoId).toBeUndefined();
});
it('descartar desde cancelar limpia el borrador', () => {
  aceptar = true;
  pantalla.formulario.nombre = 'Borrador'; pantalla.cancelar();
  expect(pantalla.hayCambios()).toBe(false);
});
it('guardar correctamente limpia sin pedir descarte', async () => {
  const confirmar = dialog.open;
  pantalla.formulario.nombre = 'Borrador'; await pantalla.guardar();
  expect(pantalla.puedeSalir()).toBe(true);
  expect(confirmar).not.toHaveBeenCalled();
});
it('guardar fallido mantiene el borrador protegido', async () => {
  service.guardar.mockRejectedValue(new Error('Error de prueba'));
  pantalla.formulario.nombre = 'Borrador'; await pantalla.guardar();
  expect(pantalla.hayCambios()).toBe(true);
  expect(pantalla.formulario.nombre).toBe('Borrador');
  expect(pantalla.error()).toBe('Error de prueba');
});
it('bloquea navegación durante una escritura pendiente', async () => {
  let terminar!: () => void;
  service.guardar.mockReturnValue(new Promise<void>(resolve => terminar = resolve));
  const guardado = pantalla.guardar();
  expect(pantalla.puedeSalir()).toBe(false);
  terminar(); await guardado;
  expect(pantalla.puedeSalir()).toBe(true);
});
it('advierte al cerrar o recargar solamente con cambios o guardado pendiente', () => {
  const limpio = new Event('beforeunload', { cancelable: true });
  pantalla.antesDeCerrar(limpio as BeforeUnloadEvent);
  expect(limpio.defaultPrevented).toBe(false);
  pantalla.formulario.nombre = 'Borrador';
  const sucio = new Event('beforeunload', { cancelable: true });
  pantalla.antesDeCerrar(sucio as BeforeUnloadEvent);
  expect(sucio.defaultPrevented).toBe(true);
});
it('router mantiene el formulario al rechazar y navega al aceptar', async () => {
  TestBed.configureTestingModule({ providers: [
    { provide: ComboService, useValue: service },
    { provide: MatDialog, useValue: dialog },
    provideRouter([
      { path: 'combos', component: Combos, canDeactivate: [cambiosPendientesGuard] },
      { path: 'destino', component: Destino }
    ])
  ] });
  TestBed.overrideProvider(MatDialog, { useValue: dialog });
  const harness = await RouterTestingHarness.create();
  const editor = await harness.navigateByUrl('/combos', Combos);
  editor.formulario.nombre = 'Borrador';
  aceptar = false;
  await harness.navigateByUrl('/destino');
  expect(TestBed.inject(Router).url).toBe('/combos');
  expect(editor.formulario.nombre).toBe('Borrador');
  aceptar = true;
  await harness.navigateByUrl('/destino', Destino);
  expect(TestBed.inject(Router).url).toBe('/destino');
});
