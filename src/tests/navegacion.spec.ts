import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { Navbar } from '../app/components/navbar/navbar';
import { Auth } from '../app/services/auth';
import { Usuario } from '../app/services/usuario';
import { AlertaService } from '../app/services/alerta';
import { Perfil } from '../app/pages/cliente/perfil/perfil';
import { Login } from '../app/pages/login/login';
import { navegacionAdmin } from '../app/models/navegacion-admin';
import { routes } from '../app/app.routes';
import { authGuard } from '../app/guards/auth-guard';
import { roleGuard } from '../app/guards/role-guard';

const auth = { obtenerSesion: vi.fn(), logout: vi.fn() };
const usuarios = { obtenerPerfil: vi.fn() };
const alertas = { consultar: vi.fn(), noLeidas: signal(0) };
beforeEach(() => {
  vi.resetAllMocks();
  alertas.noLeidas.set(0);
  auth.obtenerSesion.mockResolvedValue({ user: { id: 'yo', email: 'cliente@example.com' } });
  auth.logout.mockResolvedValue({ error: null });
  usuarios.obtenerPerfil.mockResolvedValue({
    data: { nombre: 'Ana', apellido: 'Pérez', rol: 'cliente' },
    error: null,
  });
  alertas.consultar.mockResolvedValue([]);
});
afterEach(() => TestBed.resetTestingModule());
async function navbar() {
  await TestBed.configureTestingModule({
    imports: [Navbar],
    providers: [
      provideRouter([{ path: 'perfil', component: Perfil }]),
      { provide: Auth, useValue: auth },
      { provide: Usuario, useValue: usuarios },
      { provide: AlertaService, useValue: alertas },
    ],
  }).compileComponents();
  const f = TestBed.createComponent(Navbar);
  f.detectChanges();
  await f.componentInstance.ngOnInit();
  await f.whenStable();
  f.detectChanges();
  return f;
}
it.each(['cliente', 'admin', 'empleado'])(
  'muestra los accesos del rol %s y conserva Candy en checkout',
  async (rol) => {
    usuarios.obtenerPerfil.mockResolvedValue({ data: { nombre: 'Ana', rol }, error: null });
    const f = await navbar();
    expect(!!f.nativeElement.querySelector('a[href="/admin/home"]')).toBe(rol === 'admin');
    expect(!!f.nativeElement.querySelector('a[href="/empleado/validar-entrada"]')).toBe(
      rol !== 'cliente',
    );
    for (const ruta of ['/fidelizacion', '/mis-peliculas', '/alertas']) {
      expect(!!f.nativeElement.querySelector('a[href="' + ruta + '"]')).toBe(rol === 'cliente');
    }
    expect(alertas.consultar.mock.calls.length > 0).toBe(rol === 'cliente');
    expect(f.nativeElement.querySelector('a[href="/perfil"]')).toBeTruthy();
    expect(f.nativeElement.querySelector('a[href="/candy"]')).toBeNull();
  },
);
it.each([null, { user: { id: 'anon', is_anonymous: true } }])(
  'visitante ve login sin enlaces privados',
  async (sesion) => {
    auth.obtenerSesion.mockResolvedValue(sesion);
    const f = await navbar();
    expect(f.nativeElement.querySelector('a[href="/login"]')).toBeTruthy();
    expect(f.nativeElement.querySelector('a[href="/perfil"]')).toBeNull();
    expect(usuarios.obtenerPerfil).not.toHaveBeenCalled();
  },
);
it('no muestra privilegios cuando falla la consulta del perfil', async () => {
  usuarios.obtenerPerfil.mockResolvedValue({ data: null, error: { message: 'Error' } });
  const f = await navbar();
  expect(f.nativeElement.querySelector('a[href="/admin/home"]')).toBeNull();
  expect(f.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
});
it('logout limpia accesos y contador y vuelve a cartelera', async () => {
  usuarios.obtenerPerfil.mockResolvedValue({ data: { rol: 'admin' }, error: null });
  const f = await navbar();
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  alertas.noLeidas.set(2);
  await f.componentInstance.cerrarSesion();
  await f.whenStable();
  f.detectChanges();
  expect(f.componentInstance.rol()).toBe('');
  expect(alertas.noLeidas()).toBe(0);
  expect(router.navigate).toHaveBeenCalledWith(['/']);
  expect(f.nativeElement.querySelector('a[href="/admin/home"]')).toBeNull();
});
it('no simula logout exitoso si Supabase rechaza el cierre', async () => {
  const f = await navbar();
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate');
  auth.logout.mockResolvedValue({ error: { message: 'sin conexión' } });
  await f.componentInstance.cerrarSesion();
  expect(f.componentInstance.usuarioAutenticado()).toBe(true);
  expect(f.componentInstance.errorSesion()).toContain('cerrar sesión');
  expect(router.navigate).not.toHaveBeenCalled();
});
it('perfil consulta únicamente al usuario de la sesión y no expone campos extra', async () => {
  usuarios.obtenerPerfil.mockResolvedValue({
    data: { nombre: 'Ana', apellido: 'Pérez', rol: 'cliente', grupo_sanguineo: 'A+', id: 'yo' },
    error: null,
  });
  const c = new Perfil(auth as never, usuarios as never);
  await c.cargar();
  expect(usuarios.obtenerPerfil).toHaveBeenCalledWith('yo');
  expect(c.datos()).toEqual({
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'cliente@example.com',
    rol: 'cliente',
  });
});
it('perfil borra datos anteriores al fallar y permite reintentar', async () => {
  const c = new Perfil(auth as never, usuarios as never);
  await c.cargar();
  usuarios.obtenerPerfil.mockResolvedValueOnce({ data: null, error: {} });
  await c.cargar();
  expect(c.datos()).toBeNull();
  expect(c.error()).toBeTruthy();
  await c.cargar();
  expect(c.datos()?.nombre).toBe('Ana');
});
it.each([
  ['admin', '/admin/home'],
  ['empleado', '/empleado/validar-entrada'],
  ['cliente', '/'],
])('login redirige %s a %s', async (rol, destino) => {
  const router = { navigate: vi.fn() };
  const login = new Login(
    router as never,
    { login: vi.fn().mockResolvedValue({ data: { user: { id: 'yo' } }, error: null }) } as never,
    { obtenerPerfil: vi.fn().mockResolvedValue({ data: { rol }, error: null }) } as never,
  );
  await login.ingresar();
  expect(router.navigate).toHaveBeenCalledWith([destino]);
});
it('todos los accesos del panel tienen una ruta real', () => {
  const admin = routes.find((r) => r.path === 'admin')!;
  for (const enlace of navegacionAdmin)
    expect(admin.children?.some((r) => '/admin/' + r.path === enlace.ruta)).toBe(true);
  expect(admin.children?.find((r) => r.path === '')?.redirectTo).toBe('home');
  expect(admin.data?.['roles']).toEqual(['admin']);
  expect(
    navegacionAdmin.some((e) => ['/admin/usuarios', '/admin/configuracion'].includes(e.ruta)),
  ).toBe(false);
});
it('perfil y fidelización requieren cuenta; empleado reutiliza roleGuard', () => {
  for (const path of ['perfil', 'fidelizacion', 'mis-peliculas', 'alertas'])
    expect(routes.find((r) => r.path === path)?.canActivate).toContain(authGuard);
  const empleado = routes.find((r) => r.path === 'empleado/validar-entrada');
  expect(empleado?.canMatch).toContain(roleGuard);
  expect(empleado?.data?.['roles']).toEqual(['admin', 'empleado']);
  expect(routes.find((r) => r.path === 'empleado')?.redirectTo).toBe('empleado/validar-entrada');
});

it('menú responde al botón, Escape y selección de enlaces', async () => {
  const f = await navbar();
  const boton = f.nativeElement.querySelector('.menu-toggle');
  boton.click();
  f.detectChanges();
  expect(boton.getAttribute('aria-expanded')).toBe('true');
  const perfil = f.nativeElement.querySelector('a[href="/perfil"]');
  perfil.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  f.detectChanges();
  expect(boton.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(boton);
  boton.click();
  f.detectChanges();
  // El enlace cierra el menú antes de que el router cambie de pantalla.
  perfil.addEventListener('click', (e: Event) => e.preventDefault());
  perfil.click();
  f.detectChanges();
  expect(boton.getAttribute('aria-expanded')).toBe('false');
});
it('conserva el badge del cliente', async () => {
  const f = await navbar();
  alertas.noLeidas.set(3);
  f.detectChanges();
  expect(f.nativeElement.querySelector('.alertas-contador').textContent.trim()).toBe('3');
});
