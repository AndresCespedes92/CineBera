import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Funciones } from '../app/pages/admin/funciones/funciones';
import { FuncionService } from '../app/services/funcion';
import { SalaService } from '../app/services/sala';
import { PeliculaService } from '../app/services/pelicula';
import { Pelicula } from '../app/models/pelicula';
import { supabase } from '../app/supabase';
import { SolicitudFuncion } from '../app/models/funcion';

const pelicula = {
  id: 10, titulo: 'Película de prueba', duracion: 120,
  formatos: ['2D', '3D', '4D', '5D'], idiomas: ['Castellano']
} as Pelicula;
const fila = (id: number, fecha: string, sala: number) => ({
  id, pelicula_id: 10, sala_id: sala, fecha, hora: '18:00:00',
  formato: '2D', idioma: 'Castellano', activa: true
});

describe('FuncionService: planificación simple e insert único', () => {
  const solicitud = (fecha = '2099-01-01', hora = '18:00'): SolicitudFuncion => ({
    pelicula_id: 10, fecha, hora, formato: '2D', idioma: 'Castellano'
  });
  const existente = (sala: number, fecha = '2099-01-01', hora = '18:00', duracion = 120) => ({
    sala_id: sala, fecha, hora, peliculas: { duracion }
  });
  let funciones: ReturnType<typeof existente>[];
  let catalogo: { id: number; duracion: number; formatos: string[]; idiomas: string[] }[];
  let errorFunciones: boolean;
  let errorInsert: boolean;
  let insertar: ReturnType<typeof vi.fn>;
  let consultarPagina: ReturnType<typeof vi.fn>;
  let obtenerSalas: ReturnType<typeof vi.fn>;
  let servicio: FuncionService;

  beforeEach(() => {
    funciones = [];
    catalogo = [{ id: 10, duracion: 120, formatos: ['2D', '3D', '4D', '5D'], idiomas: ['Castellano'] }];
    errorFunciones = false;
    errorInsert = false;
    obtenerSalas = vi.fn().mockResolvedValue([
      { id: 1, nombre: 'Sala 1', activa: true },
      { id: 2, nombre: 'Sala 2', activa: true },
      { id: 3, nombre: 'Sala 3', activa: true }
    ]);
    servicio = new FuncionService({ obtenerSalasActivas: obtenerSalas } as unknown as SalaService);
    insertar = vi.fn(datos => ({ select: async () => ({
      data: errorInsert ? null : datos.map((f: object, i: number) => ({ ...f, id: i + 1 })),
      error: errorInsert ? { message: 'fallo de guardado' } : null
    }) }));
    consultarPagina = vi.fn((desde: number, hasta: number) => Promise.resolve({
      data: errorFunciones ? null : funciones.slice(desde, hasta + 1),
      error: errorFunciones ? { message: 'fallo de consulta' } : null
    }));
    // Simulamos solamente el acceso a datos; el algoritmo real se ejecuta completo.
    vi.spyOn(supabase, 'from').mockImplementation(((tabla: string) => {
      if (tabla === 'peliculas') return { select: () => ({ in: async () => ({ data: catalogo, error: null }) }) };
      return {
        select: () => ({ eq: () => ({ order: () => ({ range: consultarPagina }) }) }),
        insert: insertar
      };
    }) as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('elige Sala 1 si está disponible', async () => {
    const r = await servicio.crearFunciones([solicitud()]);
    expect(r.data?.[0].sala_id).toBe(1);
    expect(obtenerSalas).toHaveBeenCalledWith(true);
    expect(insertar).toHaveBeenCalledTimes(1);
  });
  it('elige Sala 2 si Sala 1 está ocupada', async () => {
    funciones = [existente(1)];
    expect((await servicio.crearFunciones([solicitud()])).data?.[0].sala_id).toBe(2);
  });
  it('recorre varias salas ocupadas hasta la siguiente disponible', async () => {
    funciones = [existente(1), existente(2)];
    expect((await servicio.crearFunciones([solicitud()])).data?.[0].sala_id).toBe(3);
  });
  it('sin sala disponible informa fecha/hora y no inserta', async () => {
    funciones = [existente(1), existente(2), existente(3)];
    const r = await servicio.crearFunciones([solicitud()]);
    expect(r.data).toBeNull();
    expect(r.error?.message).toContain('01/01/2099');
    expect(r.error?.message).toContain('18:00');
    expect(insertar).not.toHaveBeenCalled();
  });
  it('permite exactamente 30 minutos después de finalizar', async () => {
    funciones = [existente(1)];
    expect((await servicio.crearFunciones([solicitud('2099-01-01', '20:30')])).data?.[0].sala_id).toBe(1);
  });
  it('29 minutos no alcanzan: prueba Sala 2', async () => {
    funciones = [existente(1)];
    expect((await servicio.crearFunciones([solicitud('2099-01-01', '20:29')])).data?.[0].sala_id).toBe(2);
  });
  it('detecta conflicto con la función anterior', async () => {
    funciones = [existente(1, '2099-01-01', '17:00')];
    expect((await servicio.crearFunciones([solicitud()])).data?.[0].sala_id).toBe(2);
  });
  it('deja margen también antes de una función posterior', async () => {
    funciones = [existente(1, '2099-01-01', '21:00')];
    expect((await servicio.crearFunciones([solicitud('2099-01-01', '18:31')])).data?.[0].sala_id).toBe(2);
    expect((await servicio.crearFunciones([solicitud('2099-01-01', '18:30')])).data?.[0].sala_id).toBe(1);
  });
  it('23:30 + 120 + 30 ocupa hasta las 02:00 del día siguiente', async () => {
    funciones = [existente(1, '2099-01-02', '01:59')];
    expect((await servicio.crearFunciones([solicitud('2099-01-01', '23:30')])).data?.[0].sala_id).toBe(2);
    funciones = [existente(1, '2099-01-02', '02:00')];
    expect((await servicio.crearFunciones([solicitud('2099-01-01', '23:30')])).data?.[0].sala_id).toBe(1);
  });
  it('considera una función iniciada el día anterior', async () => {
    funciones = [existente(1, '2098-12-31', '23:00', 1080)];
    expect((await servicio.crearFunciones([solicitud('2099-01-01', '17:29')])).data?.[0].sala_id).toBe(2);
  });
  it('incluye asignaciones del mismo lote antes de hacer un único insert', async () => {
    const r = await servicio.crearFunciones([solicitud(), solicitud(), solicitud()]);
    expect(r.data?.map(f => f.sala_id)).toEqual([1, 2, 3]);
    expect(insertar).toHaveBeenCalledTimes(1);
    expect(insertar.mock.calls[0][0]).toHaveLength(3);
  });
  it('cada fecha puede obtener una sala diferente', async () => {
    funciones = [existente(1, '2099-01-02')];
    const r = await servicio.crearFunciones([solicitud(), solicitud('2099-01-02'), solicitud('2099-01-03')]);
    expect(r.data?.map(f => f.sala_id)).toEqual([1, 2, 1]);
  });
  it('no inserta las primeras si una fecha posterior no consigue sala', async () => {
    funciones = [existente(1, '2099-01-02'), existente(2, '2099-01-02'), existente(3, '2099-01-02')];
    const r = await servicio.crearFunciones([solicitud(), solicitud('2099-01-02')]);
    expect(r.error?.message).toContain('02/01/2099');
    expect(insertar).not.toHaveBeenCalled();
  });
  it('un lote que supera las salas disponibles tampoco inserta parcialmente', async () => {
    const r = await servicio.crearFunciones([solicitud(), solicitud(), solicitud(), solicitud()]);
    expect(r.error).not.toBeNull();
    expect(insertar).not.toHaveBeenCalled();
  });
  it('un fallo de consulta no se interpreta como salas libres', async () => {
    errorFunciones = true;
    expect((await servicio.crearFunciones([solicitud()])).error).not.toBeNull();
    expect(insertar).not.toHaveBeenCalled();
  });
  it('se detiene también ante un fallo de SalaService', async () => {
    obtenerSalas.mockRejectedValue(new Error('Error de salas'));
    expect((await servicio.crearFunciones([solicitud()])).error?.message).toBe('Error de salas');
    expect(insertar).not.toHaveBeenCalled();
  });
  it('lee una segunda página antes de decidir disponibilidad', async () => {
    funciones = Array.from({ length: 1000 }, () => existente(3, '2098-01-01'));
    funciones.push(existente(1));
    const r = await servicio.crearFunciones([solicitud()]);
    expect(consultarPagina).toHaveBeenCalledTimes(2);
    expect(r.data?.[0].sala_id).toBe(2);
  });
  it('la creación individual también ignora una sala manual inyectada', async () => {
    const r = await servicio.crearFuncion({ ...solicitud(), sala_id: 999 } as SolicitudFuncion);
    expect(r.data?.sala_id).toBe(1);
  });
  it('no informa éxito cuando Supabase rechaza el insert', async () => {
    errorInsert = true;
    const r = await servicio.crearFunciones([solicitud()]);
    expect(r.data).toBeNull();
    expect(r.error?.message).toContain('No se pudo guardar');
  });
  it('no admite fechas normalizadas silenciosamente ni duraciones inválidas', async () => {
    expect((await servicio.crearFunciones([solicitud('2099-02-30')])).error).not.toBeNull();
    catalogo[0].duracion = 0;
    expect((await servicio.crearFunciones([solicitud()])).error).not.toBeNull();
    expect(insertar).not.toHaveBeenCalled();
  });
  it('no aplica compatibilidades por sala para 3D, 4D o 5D', async () => {
    for (const formato of ['3D', '4D', '5D']) {
      expect((await servicio.crearFunciones([{ ...solicitud(), formato }])).data?.[0].sala_id).toBe(1);
    }
  });
});

describe('Bloque 1: programación por fecha', () => {
  let componente: Funciones;
  let servicio: { crearFunciones: ReturnType<typeof vi.fn>; obtenerFuncionesSemana: ReturnType<typeof vi.fn>; desactivarFuncion: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    servicio = {
      crearFunciones: vi.fn(),
      obtenerFuncionesSemana: vi.fn().mockResolvedValue({ data: [], error: null }),
      desactivarFuncion: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null })
    };
    componente = new Funciones({} as PeliculaService, {} as SalaService,
      servicio as unknown as FuncionService, { detectChanges: vi.fn() } as unknown as ChangeDetectorRef);
    componente.peliculas = [pelicula];
    componente.salas = [{ id: 1, nombre: 'Sala 1', activa: true }, { id: 3, nombre: 'Sala 3', activa: true }];
    componente.cargando = false;
    componente.fechaInicioSemana = '2099-01-01';
    componente.fechasSemana = ['2099-01-01', '2099-01-02', '2099-01-03', '2099-01-04', '2099-01-05', '2099-01-06', '2099-01-07'];
    componente.fechasSeleccionadas = ['2099-01-02', '2099-01-05', '2099-01-06'];
    componente.peliculaIdSeleccionada = 10;
    componente.hora = '18:00';
    componente.formato = '2D';
    componente.idioma = 'Castellano';
  });
  afterEach(() => vi.restoreAllMocks());

  it('conserva sólo los días elegidos y no asigna salas en Angular', () => {
    componente.agregarFuncionTemporal();
    expect(componente.obtenerPendientes().map(f => f.fecha)).toEqual(componente.fechasSeleccionadas);
    expect(componente.obtenerPendientes().every(f => f.salaId === null)).toBe(true);
  });
  it('envía un solo lote y muestra salas distintas por fecha', async () => {
    componente.agregarFuncionTemporal();
    servicio.crearFunciones.mockResolvedValue({ data: [fila(1, '2099-01-02', 1), fila(2, '2099-01-05', 3), fila(3, '2099-01-06', 1)], error: null });
    await componente.guardarProgramacionSemanal();
    expect(servicio.crearFunciones).toHaveBeenCalledTimes(1);
    expect(servicio.crearFunciones.mock.calls[0][0]).toHaveLength(3);
    expect(servicio.crearFunciones.mock.calls[0][0][0]).not.toHaveProperty('sala_id');
    expect(componente.obtenerPendientes()).toHaveLength(0);
    expect(componente.resultadoGuardado[1]).toContain('Sala 3');
  });
  it('conserva todo el borrador y muestra fecha/horario si la servicio rechaza', async () => {
    componente.agregarFuncionTemporal();
    const mensaje = 'No hay sala disponible el 05/01/2099 a las 18:00. No se guardó ninguna función del lote.';
    servicio.crearFunciones.mockResolvedValue({ data: null, error: { message: mensaje } });
    await componente.guardarProgramacionSemanal();
    expect(componente.obtenerPendientes()).toHaveLength(3);
    expect(componente.mensaje).toBe(mensaje);
    expect(componente.guardando).toBe(false);
  });
  it('ignora doble clic mientras la servicio está pendiente', async () => {
    componente.agregarFuncionTemporal();
    let resolver!: (valor: unknown) => void;
    servicio.crearFunciones.mockReturnValue(new Promise(r => resolver = r));
    const primera = componente.guardarProgramacionSemanal();
    await componente.guardarProgramacionSemanal();
    expect(servicio.crearFunciones).toHaveBeenCalledTimes(1);
    resolver({ data: [], error: { message: 'Sin salas' } });
    await primera;
  });
  it('carga toda la semana, incluyendo martes sin función el jueves', async () => {
    servicio.obtenerFuncionesSemana.mockResolvedValue({ data: [fila(9, '2099-01-06', 3)], error: null });
    await componente.cargarProgramacionGuardada();
    expect(servicio.obtenerFuncionesSemana).toHaveBeenCalledWith('2099-01-01', '2099-01-07');
    expect(componente.obtenerFuncionesDeSala(3)[0].fecha).toBe('2099-01-06');
  });
  it('distingue error de carga de semana vacía', async () => {
    servicio.obtenerFuncionesSemana.mockResolvedValue({ data: null, error: { message: 'fallo' } });
    await componente.cargarProgramacionGuardada();
    expect(componente.errorCarga).not.toBe('');
    expect(componente.cargando).toBe(false);
  });
  it('muestra la fecha siguiente al finalizar después de medianoche', () => {
    expect(componente.calcularFinal('2099-01-01', '23:00', 150)).toBe('02/01/2099 01:30');
  });
  it('desactiva por ID sólo la fecha elegida y conserva borradores', async () => {
    componente.agregarFuncionTemporal();
    servicio.obtenerFuncionesSemana.mockResolvedValue({ data: [fila(9, '2099-01-06', 3), fila(10, '2099-01-07', 1)], error: null });
    await componente.cargarProgramacionGuardada();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await componente.eliminarFuncionTemporal(componente.obtenerFuncionesDeSala(3)[0]);
    expect(servicio.desactivarFuncion).toHaveBeenCalledWith(9);
    expect(componente.obtenerFuncionesDeSala(1)).toHaveLength(1);
    expect(componente.obtenerPendientes()).toHaveLength(3);
  });
  it('rechaza horario anterior a las 17 y selección sin días', () => {
    componente.hora = '16:59';
    componente.agregarFuncionTemporal();
    expect(componente.obtenerPendientes()).toHaveLength(0);
    componente.hora = '18:00';
    componente.fechasSeleccionadas = [];
    componente.agregarFuncionTemporal();
    expect(componente.obtenerPendientes()).toHaveLength(0);
  });
});

describe('Bloque 1: template', () => {
  it('renderiza siete casillas, sin selector de sala ni funciones ficticias', async () => {
    await TestBed.configureTestingModule({
      imports: [Funciones], providers: [provideRouter([]),
        { provide: PeliculaService, useValue: { obtenerPeliculas: async () => [pelicula] } },
        { provide: SalaService, useValue: { obtenerSalasActivas: async () => [] } },
        { provide: FuncionService, useValue: { obtenerFuncionesSemana: async () => ({ data: [], error: null }) } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(Funciones);
    await fixture.componentInstance.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('select#sala')).toBeNull();
    expect(html.querySelectorAll('input[type=checkbox]')).toHaveLength(7);
    expect(html.querySelectorAll('.funcion-card')).toHaveLength(0);
    fixture.destroy();
  });
});
