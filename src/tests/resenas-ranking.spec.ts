import { ResenaService } from '../app/services/resena';
import { Resenas } from '../app/components/resenas/resenas';
import { Home } from '../app/pages/cliente/home/home';
import { supabase } from '../app/supabase';
import { Pelicula } from '../app/models/pelicula';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth } from '../app/services/auth';

const peliculas = [{id:1,titulo:'Acción final',generos:['Acción','Drama']},{id:2,titulo:'Otro mundo',generos:['Drama']},{id:3,titulo:'Comedia',generos:['Comedia']},{id:4,titulo:'Cuarta',generos:[]}] as Pelicula[];
const fila={pelicula_id:1,usuario_id:'yo',estrellas:4,comentario:'Buenísima',created_at:'2026-09-29'};
const servicio=new ResenaService();
let respuesta: {data:unknown;error:unknown};
let pasos: Record<string,ReturnType<typeof vi.fn>>;
beforeEach(()=>{
  respuesta={data:[],error:null};pasos={};
  vi.spyOn(supabase.auth,'getUser').mockResolvedValue({data:{user:{id:'yo'}},error:null} as never);
  vi.spyOn(supabase,'from').mockImplementation((()=>{
    const q:Record<string,unknown>={};
    for(const metodo of ['select','eq','order','range','insert','update','single','in','limit']) q[metodo]=pasos[metodo]=vi.fn(()=>q);
    q['then']=(resolve:(r:unknown)=>unknown)=>Promise.resolve(respuesta).then(resolve);
    return q;
  }) as never);
});
afterEach(()=>{vi.restoreAllMocks();TestBed.resetTestingModule();});

describe('Filtros y ranking',()=>{
  it('busca sin distinguir tildes, mayúsculas o espacios exteriores',()=>expect(servicio.filtrar(peliculas,' ACCION ','')).toEqual([peliculas[0]]));
  it('admite cada género de una película y combina filtros',()=>{
    expect(servicio.filtrar(peliculas,'','Drama')).toHaveLength(2);
    expect(servicio.filtrar(peliculas,'otro','Drama')).toEqual([peliculas[1]]);
    expect(servicio.filtrar(peliculas,'otro','Comedia')).toEqual([]);
  });
  it('ordena ventas con desempate estable sin modificar la lista original',()=>{
    expect(servicio.ordenar(peliculas,[{pelicula_id:2,entradas_vendidas:8},{pelicula_id:3,entradas_vendidas:8}]).map(p=>p.id)).toEqual([2,3,1,4]);
    expect(peliculas[0].id).toBe(1);
  });
  it('consulta solo los tres primeros de la cartelera y convierte los totales',async()=>{
    respuesta.data=[{pelicula_id:2,entradas_vendidas:'8'}];
    expect(await servicio.obtenerVentas([1,2])).toEqual([{pelicula_id:2,entradas_vendidas:8}]);
    expect(pasos['in']).toHaveBeenCalledWith('pelicula_id',[1,2]);expect(pasos['limit']).toHaveBeenCalledWith(3);
  });
  it('no consulta indicadores sin películas',async()=>{
    expect(await servicio.obtenerVentas([])).toEqual([]);expect(await servicio.obtenerResumen([])).toEqual([]);expect(supabase.from).not.toHaveBeenCalled();
  });
  it('diferencia error de ranking y cero ventas',async()=>{
    respuesta.error={message:'offline'};await expect(servicio.obtenerVentas([1])).rejects.toThrow('Top 3');
  });
  it('usa el promedio propio y no valores TMDB',async()=>{
    respuesta.data=[{pelicula_id:1,promedio:'4.5',cantidad:'2'}];expect(await servicio.obtenerResumen([1])).toEqual([{pelicula_id:1,promedio:4.5,cantidad:2}]);
  });
  it('un fallo de indicadores no oculta las películas',async()=>{
    const mock={obtenerVentas:async()=>{throw Error();},obtenerResumen:async()=>[],filtrar:servicio.filtrar};
    const home=new Home({} as never,{} as never,{} as never,{detectChanges:()=>{}} as never,mock as never);
    home.peliculas=peliculas;await home.cargarIndicadores();expect(home.errorRanking).toContain('Top 3');expect(home.peliculasFiltradas).toHaveLength(4);
  });
});

describe('Reseñas',()=>{
  it.each([0,6,2.5,NaN])('rechaza estrellas inválidas %s',async valor=>{
    await expect(servicio.guardar(1,valor,'Hola',false)).rejects.toThrow('1 y 5');expect(supabase.from).not.toHaveBeenCalled();
  });
  it.each(['   ','a'.repeat(301)])('rechaza comentarios vacíos o largos',async comentario=>{
    await expect(servicio.guardar(1,4,comentario,false)).rejects.toThrow('300');
  });
  it('no escribe sin usuario registrado',async()=>{
    vi.mocked(supabase.auth.getUser).mockResolvedValue({data:{user:null},error:null} as never);
    await expect(servicio.guardar(1,4,'Hola',false)).rejects.toThrow('sesión');expect(supabase.from).not.toHaveBeenCalled();
  });
  it('no escribe con cuenta anónima de Auth',async()=>{
    vi.mocked(supabase.auth.getUser).mockResolvedValue({data:{user:{id:'yo',is_anonymous:true}},error:null} as never);
    await expect(servicio.guardar(1,4,'Hola',false)).rejects.toThrow('sesión');
  });
  it('inserta el usuario autenticado y recorta el comentario',async()=>{
    respuesta.data={pelicula_id:1};await servicio.guardar(1,5,' Hola ',false);
    expect(pasos['insert']).toHaveBeenCalledWith({pelicula_id:1,usuario_id:'yo',estrellas:5,comentario:'Hola'});
  });
  it('edita solo la reseña propia sin cambiar su identidad',async()=>{
    respuesta.data={pelicula_id:1};await servicio.guardar(1,3,'Cambio',true);
    expect(pasos['update']).toHaveBeenCalledWith({estrellas:3,comentario:'Cambio'});expect(pasos['eq']).toHaveBeenCalledWith('usuario_id','yo');
  });
  it('informa el duplicado y no lo presenta como éxito',async()=>{
    respuesta.error={code:'23505'};await expect(servicio.guardar(1,4,'Hola',false)).rejects.toThrow('Ya tenés');
  });
  it('informa una actualización sin filas',async()=>{
    respuesta.data=null;await expect(servicio.guardar(1,4,'Hola',true)).rejects.toThrow('No se pudo');
  });
  it('carga reseñas por película y propaga fallos',async()=>{
    respuesta.data=[fila];expect(await servicio.obtener(1)).toEqual([fila]);expect(pasos['eq']).toHaveBeenCalledWith('pelicula_id',1);
    respuesta.error={};await expect(servicio.obtener(1)).rejects.toThrow('cargar');
  });
  it('promedio y formulario se actualizan al cargar la reseña propia',async()=>{
    const pagina=new Resenas({obtener:async()=>[fila,{...fila,usuario_id:'otro',estrellas:5}]} as never,{obtenerSesion:async()=>({user:{id:'yo'}})} as never);
    pagina.peliculaId=1;await pagina.cargar();expect(pagina.promedio()).toBe('4.5');expect(pagina.comentario).toBe('Buenísima');expect(pagina.propia()).toEqual(fila);
  });
  it('el template público muestra reseñas e invita a iniciar sesión sin formulario',async()=>{
    await TestBed.configureTestingModule({imports:[Resenas],providers:[provideRouter([]),{provide:ResenaService,useValue:{obtener:async()=>[fila]}},{provide:Auth,useValue:{obtenerSesion:async()=>null}}]}).compileComponents();
    const fixture=TestBed.createComponent(Resenas);fixture.componentRef.setInput('peliculaId',1);fixture.detectChanges();
    await vi.waitFor(()=>expect(fixture.componentInstance.cargando()).toBe(false));fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('4.0');expect(fixture.nativeElement.querySelector('form')).toBeNull();expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/login');
  });
});
