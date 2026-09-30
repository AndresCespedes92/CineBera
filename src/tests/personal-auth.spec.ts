import { Auth } from '../app/services/auth';
import { supabase, crearClienteAltaPersonal } from '../app/supabase';
import { Usuario } from '../app/services/usuario';
// SDK real con transporte simulado: ninguna cuenta ni dato de prueba sale a Supabase.
const admin = {
  id: 'admin-prueba',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'admin@example.test',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};
const empleado = {
  ...admin,
  id: 'empleado-prueba',
  email: 'empleado@example.test',
  identities: [
    { identity_id: 'identidad', id: 'identidad', user_id: 'empleado-prueba', provider: 'email' },
  ],
};
const token = (id: string) =>
  btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) +
  '.' +
  btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })) +
  '.c2lnbmF0dXJl';
let fetchMock: ReturnType<typeof vi.fn>;
let signup: any;
beforeEach(async () => {
  signup = {
    access_token: token('empleado-prueba'),
    refresh_token: 'refresh-empleado',
    expires_in: 3600,
    token_type: 'bearer',
    user: empleado,
  };
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    return new Response(JSON.stringify(url.includes('/signup') ? signup : admin), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  const inicial = await supabase.auth.setSession({
    access_token: token(admin.id),
    refresh_token: 'refresh-admin',
  });
  expect(inicial.error).toBeNull();
  expect(inicial.data.session?.user.id).toBe(admin.id);
  fetchMock.mockClear();
});
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => {
  await supabase.auth.dispose();
  localStorage.clear();
});
it.each([false, true])(
  'mantiene sesión y almacenamiento con confirmación=%s',
  async (confirmacion) => {
    if (confirmacion) signup = empleado;
    const before = JSON.stringify(localStorage);
    const resultado = await new Auth().registrarEmpleado('empleado@example.test', 'prueba123');
    expect(resultado).toEqual({ id: empleado.id, requiereConfirmacion: confirmacion });
    expect((await supabase.auth.getSession()).data.session?.user.id).toBe(admin.id);
    expect(JSON.stringify(localStorage)).toBe(before);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/signup');
  },
);
it('rechaza identidad vacía de un correo duplicado', async () => {
  signup = { ...empleado, identities: [] };
  await expect(new Auth().registrarEmpleado('duplicado@example.test', 'prueba123')).rejects.toThrow(
    'alta nueva',
  );
  expect((await supabase.auth.getSession()).data.session?.user.id).toBe(admin.id);
});
it('el cliente temporal no lee la sesión administrativa', async () => {
  const temporal = crearClienteAltaPersonal();
  try {
    expect((await temporal.auth.getSession()).data.session).toBeNull();
  } finally {
    await temporal.auth.dispose();
  }
});
it('listado usa columnas reales y filtra empleados', async () => {
  fetchMock.mockResolvedValue(
    new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
  await new Usuario().listarEmpleados();
  const url = new URL(String(fetchMock.mock.calls[0][0]));
  expect(url.searchParams.get('rol')).toBe('eq.empleado');
  expect(url.searchParams.get('select')).not.toContain('email');
});
it('service fuerza empleado incluso ante un rol adicional', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
  await new Usuario().crearPerfilEmpleado({ id: 'nuevo', rol: 'admin', nombre: 'Ana' } as never);
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.rol).toBe('empleado');
});
