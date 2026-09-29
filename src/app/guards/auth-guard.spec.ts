import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { Auth } from '../services/auth';
import { authGuard } from './auth-guard';

describe('authGuard', () => {
  const auth = { obtenerSesion: vi.fn() };
  const ejecutar = () => TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: Auth, useValue: auth}]});
  });
  it.each([null, {user: {is_anonymous: true}}])('envía visitantes al login', async sesion => {
    auth.obtenerSesion.mockResolvedValue(sesion);
    expect(await ejecutar()).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });
  it('acepta una cuenta registrada', async () => {
    auth.obtenerSesion.mockResolvedValue({user: {id: 'cliente', is_anonymous: false}});
    expect(await ejecutar()).toBe(true);
  });
  it('redirige cuando falla la consulta de sesión', async () => {
    auth.obtenerSesion.mockRejectedValue(new Error('sin conexión'));
    expect(await ejecutar()).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });
});
