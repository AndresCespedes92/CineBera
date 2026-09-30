import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Roles } from '../app/directives/roles';
@Component({
  imports: [Roles],
  template: ` <span *appRoles="['admin']; actual: rol()" class="admin">Administración</span>
    <span *appRoles="['admin', 'empleado']; actual: rol()" class="operativo">Validar</span>`,
})
class Prueba {
  rol = signal<string | null>(null);
}
afterEach(() => TestBed.resetTestingModule());
it.each([
  ['admin', true, true],
  ['empleado', false, true],
  ['cliente', false, false],
  ['', false, false],
  [null, false, false],
  ['desconocido', false, false],
])('visibilidad para %s', (rol, admin, operativo) => {
  const f = TestBed.createComponent(Prueba);
  f.componentInstance.rol.set(rol);
  f.detectChanges();
  expect(!!f.nativeElement.querySelector('.admin')).toBe(admin);
  expect(!!f.nativeElement.querySelector('.operativo')).toBe(operativo);
});
it('actualiza al cambiar rol y no duplica vistas', () => {
  const f = TestBed.createComponent(Prueba);
  f.componentInstance.rol.set('admin');
  f.detectChanges();
  f.detectChanges();
  expect(f.nativeElement.querySelectorAll('.admin')).toHaveLength(1);
  f.componentInstance.rol.set('empleado');
  f.detectChanges();
  expect(f.nativeElement.querySelector('.admin')).toBeNull();
  f.componentInstance.rol.set(null);
  f.detectChanges();
  expect(f.nativeElement.querySelector('.operativo')).toBeNull();
});
