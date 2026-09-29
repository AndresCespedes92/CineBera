import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Route } from '@angular/router';
import { Auth } from '../services/auth';
import { Usuario } from '../services/usuario';
import { roleGuard } from './role-guard';

describe('roleGuard', () => {
  const auth = { obtenerSesion: vi.fn() };
  const usuarios = { obtenerPerfil: vi.fn() };
  const ejecutar = (route: Route = {}) => TestBed.runInInjectionContext(() => roleGuard(route, [], {} as Parameters<typeof roleGuard>[2]));
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [provideRouter([]), {provide: Auth, useValue: auth}, {provide: Usuario, useValue: usuarios}] });
    auth.obtenerSesion.mockResolvedValue({user: {id: 'usuario'}});
  });
  it.each([null, {user: {id: 'anonimo', is_anonymous: true}}])('envía visitantes al login', async sesion => {
    auth.obtenerSesion.mockResolvedValue(sesion);
    expect(await ejecutar()).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
    expect(usuarios.obtenerPerfil).not.toHaveBeenCalled();
  });
  it.each(['admin', 'empleado'])('permite validar entradas al rol %s', async rol => {
    usuarios.obtenerPerfil.mockResolvedValue({data: {rol}, error: null});
    expect(await ejecutar({data: {roles: ['admin', 'empleado']}})).toBe(true);
  });
  it.each(['cliente', 'empleado'])('impide entrar a administración al rol %s', async rol => {
    usuarios.obtenerPerfil.mockResolvedValue({data: {rol}, error: null});
    expect(await ejecutar()).toEqual(TestBed.inject(Router).createUrlTree(['/']));
  });
  it('permite administración al admin', async () => {
    usuarios.obtenerPerfil.mockResolvedValue({data: {rol: 'admin'}, error: null});
    expect(await ejecutar()).toBe(true);
  });
  it('rechaza un perfil que no pudo cargarse', async () => {
    usuarios.obtenerPerfil.mockResolvedValue({data: null, error: {message: 'error'}});
    expect(await ejecutar()).toEqual(TestBed.inject(Router).createUrlTree(['/']));
  });
  it('resuelve un error de sesión con una redirección', async () => {
    auth.obtenerSesion.mockRejectedValue(new Error('sin conexión'));
    expect(await ejecutar()).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });
});

