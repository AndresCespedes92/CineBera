import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { Personal } from '../app/pages/admin/personal/personal';
import { Auth } from '../app/services/auth';
import { Usuario } from '../app/services/usuario';
import { Registro } from '../app/pages/registro/registro';
import { routes } from '../app/app.routes';
import { roleGuard } from '../app/guards/role-guard';
import { cambiosPendientesGuard } from '../app/guards/cambios-pendientes-guard';
const auth = { obtenerSesion: vi.fn(), registrarEmpleado: vi.fn(), registrar: vi.fn() };
const usuarios = {
  obtenerPerfil: vi.fn(),
  listarEmpleados: vi.fn(),
  crearPerfilEmpleado: vi.fn(),
  crearPerfil: vi.fn(),
};
const dialog = { open: vi.fn(() => ({ afterClosed: () => of(false) })) };
const valores = {
  nombre: 'Ana',
  apellido: 'Pérez',
  email: 'personal@example.test',
  password: 'prueba123',
  confirmarPassword: 'prueba123',
  diaNacimiento: 15,
  mesNacimiento: 6,
  anioNacimiento: 1990,
  grupoSanguineo: 'A+',
  colorOjos: 'Marrón',
  diasVacaciones: 14,
};
let c: Personal;
beforeEach(() => {
  vi.resetAllMocks();
  auth.obtenerSesion.mockResolvedValue({ user: { id: 'admin' } });
  auth.registrarEmpleado.mockResolvedValue({ id: 'nuevo', requiereConfirmacion: false });
  usuarios.obtenerPerfil.mockImplementation(async (id: string) =>
    id === 'admin' ? { data: { rol: 'admin' }, error: null } : { data: null, error: {} },
  );
  usuarios.listarEmpleados.mockResolvedValue({ data: [], error: null });
  usuarios.crearPerfilEmpleado.mockResolvedValue({ error: null });
  dialog.open.mockReturnValue({ afterClosed: () => of(false) });
  c = new Personal(auth as never, usuarios as never, dialog as never);
  c.form.setValue(valores);
});
afterEach(() => TestBed.resetTestingModule());
it('lista empleados y recupera un error con reintento', async () => {
  usuarios.listarEmpleados.mockResolvedValueOnce({ error: {} });
  await c.cargar();
  expect(c.errorListado()).toBeTruthy();
  usuarios.listarEmpleados.mockResolvedValue({
    data: [{ id: 'e', nombre: 'Eva', rol: 'empleado' }],
    error: null,
  });
  await c.cargar();
  expect(c.errorListado()).toBe('');
  expect(c.empleados()).toHaveLength(1);
});
it.each(['cliente', 'empleado', null])('rechaza alta si dejó de ser admin: %s', async (rol) => {
  usuarios.obtenerPerfil.mockResolvedValue({ data: { rol }, error: null });
  await c.guardar();
  expect(auth.registrarEmpleado).not.toHaveBeenCalled();
  expect(c.errorAlta()).toBeTruthy();
});
it('rechaza una sesión anónima', async () => {
  auth.obtenerSesion.mockResolvedValue({ user: { id: 'anon', is_anonymous: true } });
  await c.guardar();
  expect(auth.registrarEmpleado).not.toHaveBeenCalled();
});
it.each([
  ['diasVacaciones', -1],
  ['diasVacaciones', 1.5],
  ['diasVacaciones', 32768],
  ['nombre', '   '],
  ['email', 'incorrecto'],
  ['confirmarPassword', 'distinta'],
  ['diaNacimiento', 31],
])('valida %s=%s', async (key, value) => {
  c.form.patchValue({ [key]: value });
  await c.guardar();
  expect(auth.registrarEmpleado).not.toHaveBeenCalled();
});
it.each([false, true])('crea solo empleado e informa confirmación=%s', async (confirmacion) => {
  auth.registrarEmpleado.mockResolvedValue({ id: 'nuevo', requiereConfirmacion: confirmacion });
  await c.guardar();
  expect(usuarios.crearPerfilEmpleado).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'nuevo', rol: 'empleado', fecha_nacimiento: '1990-06-15' }),
  );
  expect(c.mensaje().includes('confirmar')).toBe(confirmacion);
  expect(c.form.pristine).toBe(true);
  expect(c.form.controls.password.value).toBe('');
  expect(c.perfilPendiente()).toBeNull();
});
it('Auth rechazado no inserta perfil', async () => {
  auth.registrarEmpleado.mockRejectedValue(Error('Registro no disponible'));
  await c.guardar();
  expect(usuarios.crearPerfilEmpleado).not.toHaveBeenCalled();
  expect(c.errorAlta()).toContain('Registro');
});
it('reintenta solo el perfil y no retiene contraseñas', async () => {
  usuarios.crearPerfilEmpleado.mockResolvedValueOnce({ error: {} });
  await c.guardar();
  expect(c.perfilPendiente()?.id).toBe('nuevo');
  expect(c.form.controls.password.value).toBe('');
  await c.guardar();
  expect(auth.registrarEmpleado).toHaveBeenCalledTimes(1);
  expect(usuarios.crearPerfilEmpleado).toHaveBeenCalledTimes(2);
  expect(c.mensaje()).toContain('creado');
});
it('reconoce un insert confirmado después de perder su respuesta', async () => {
  usuarios.crearPerfilEmpleado.mockImplementation(async (perfil) => {
    usuarios.obtenerPerfil.mockResolvedValueOnce({ data: perfil, error: null });
    return { error: {} };
  });
  await c.guardar();
  expect(c.perfilPendiente()).toBeNull();
  expect(c.mensaje()).toContain('creado');
});
it('no acepta como éxito un perfil existente con otro rol', async () => {
  usuarios.crearPerfilEmpleado.mockResolvedValue({ error: {} });
  usuarios.obtenerPerfil
    .mockResolvedValueOnce({ data: { rol: 'admin' }, error: null })
    .mockResolvedValueOnce({ data: { id: 'nuevo', rol: 'cliente' }, error: null });
  await c.guardar();
  expect(c.perfilPendiente()).not.toBeNull();
  expect(c.mensaje()).toBe('');
});
it('bloquea doble envío y salida durante el alta', async () => {
  let resolver!: (v: any) => void;
  auth.registrarEmpleado.mockImplementation(() => new Promise((r) => (resolver = r)));
  const p = c.guardar();
  await Promise.resolve();
  await Promise.resolve();
  await c.guardar();
  expect(c.puedeSalir()).toBe(false);
  resolver({ id: 'nuevo', requiereConfirmacion: false });
  await p;
  expect(auth.registrarEmpleado).toHaveBeenCalledTimes(1);
});
it('conserva borrador cuando se cancela la confirmación de salida', () => {
  c.form.markAsDirty();
  c.mostrarFormulario.set(true);
  c.cancelar();
  expect(c.mostrarFormulario()).toBe(true);
  expect(dialog.open).toHaveBeenCalled();
});
it('Registro sigue creando clientes y tiene un formulario independiente', async () => {
  const registro = new Registro(auth as never, usuarios as never);
  registro.registroForm.setValue(valores);
  auth.registrar.mockResolvedValue({ data: { user: { id: 'cliente' } }, error: null });
  usuarios.crearPerfil.mockResolvedValue({ error: null });
  await registro.registrar();
  expect(usuarios.crearPerfil).toHaveBeenCalledWith(expect.objectContaining({ rol: 'cliente' }));
  registro.registroForm.reset();
  expect(c.form.controls.nombre.value).toBe('Ana');
});
it('Personal hereda guard admin y utiliza CanDeactivate', () => {
  const admin = routes.find((r) => r.path === 'admin')!;
  expect(admin.canMatch).toContain(roleGuard);
  expect(admin.data?.['roles']).toEqual(['admin']);
  expect(admin.children?.find((r) => r.path === 'personal')?.canDeactivate).toContain(
    cambiosPendientesGuard,
  );
});
it('interfaz integra listado, formulario y alta', async () => {
  await TestBed.configureTestingModule({
    imports: [Personal],
    providers: [
      { provide: Auth, useValue: auth },
      { provide: Usuario, useValue: usuarios },
      { provide: MatDialog, useValue: dialog },
    ],
  }).compileComponents();
  const f = TestBed.createComponent(Personal);
  f.detectChanges();
  await f.whenStable();
  f.nativeElement.querySelector('button').click();
  f.detectChanges();
  expect(f.nativeElement.querySelector('h2').textContent).toContain('Nuevo empleado');
  f.componentInstance.form.setValue(valores);
  await f.componentInstance.guardar();
  f.detectChanges();
  expect(f.nativeElement.textContent).toContain('Empleado creado correctamente');
});
