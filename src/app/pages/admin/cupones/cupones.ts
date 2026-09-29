import { MatButtonModule } from '@angular/material/button';
import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import {
  Cupon,
  CuponService
} from '../../../services/cupon';


@Component({
  selector: 'app-cupones',

  /*
   * Nuestro proyecto utiliza componentes standalone.
   *
   * Esta pantalla por ahora no necesita importar
   * otros componentes o directivas.
   */
  imports: [MatButtonModule, ],

  templateUrl: './cupones.html',
  styleUrl: './cupones.css'
})
export class Cupones implements OnInit {


  /*
   * =====================================================
   * ESTADO DE LA PANTALLA
   * =====================================================
   *
   * Guardamos los cupones recuperados de Supabase.
   *
   * Utilizamos un Signal porque cuando hagamos:
   *
   * cupones.set(...)
   *
   * Angular actualizará automáticamente el HTML.
   */
  cupones =
    signal<Cupon[]>([]);


  /*
   * Mientras esperamos la respuesta de Supabase,
   * mostramos un mensaje de carga.
   */
  cargando =
    signal<boolean>(true);


  /*
 * =====================================================
 * CUPÓN EN EDICIÓN
 * =====================================================
 *
 * Guarda el ID del cupón que actualmente
 * está modificando el administrador.
 *
 * null significa que no estamos editando ninguno.
 */
cuponEditandoId =
  signal<number | null>(null);



  /*
 * Valor temporal que escribe el administrador.
 *
 * Todavía NO modifica Supabase.
 * Primero se modifica en la pantalla y después
 * el administrador presiona Guardar.
 */
porcentajeEditando =
  signal<number>(0);


/*
 * Nos permite evitar múltiples operaciones
 * mientras Supabase está actualizando.
 */
guardando =
  signal<boolean>(false);


  /*
   * =====================================================
   * INYECCIÓN DE DEPENDENCIAS
   * =====================================================
   *
   * El componente NO consulta directamente Supabase.
   *
   * Esa responsabilidad pertenece a CuponService.
   */
  constructor(
    private cuponService: CuponService
  ) {}


  /*
   * =====================================================
   * ngOnInit
   * =====================================================
   *
   * Angular ejecuta este método cuando se inicializa
   * el componente.
   *
   * Lo usamos para cargar los cupones apenas el
   * administrador entra a la pantalla.
   */
  async ngOnInit(): Promise<void> {

    await this.cargarCupones();

  }


  /*
   * =====================================================
   * CARGAR CUPONES
   * =====================================================
   */
  async cargarCupones(): Promise<void> {

    this.cargando.set(true);


    const cupones =
      await this.cuponService
        .obtenerCupones();


    /*
     * Guardamos la respuesta dentro del Signal.
     *
     * Esto provoca que Angular vuelva a evaluar
     * el template.
     */
    this.cupones.set(
      cupones
    );


    this.cargando.set(false);

  }


  /*
 * =====================================================
 * INICIAR EDICIÓN
 * =====================================================
 *
 * Recibimos el cupón seleccionado y copiamos
 * su porcentaje actual al formulario.
 */
editarCupon(
  cupon: Cupon
): void {

  this.cuponEditandoId.set(
    cupon.id
  );

  this.porcentajeEditando.set(
    cupon.porcentaje
  );

}


/*
 * =====================================================
 * CAMBIAR PORCENTAJE TEMPORAL
 * =====================================================
 *
 * El evento viene del input HTML.
 *
 * Todavía no guardamos nada en Supabase.
 */
cambiarPorcentaje(
  event: Event
): void {

  const input =
    event.target as HTMLInputElement;

  this.porcentajeEditando.set(
    Number(input.value)
  );

}


/*
 * =====================================================
 * CANCELAR EDICIÓN
 * =====================================================
 */
cancelarEdicion(): void {

  this.cuponEditandoId.set(null);

}


/*
 * =====================================================
 * GUARDAR CUPÓN
 * =====================================================
 */
async guardarCupon(
  cupon: Cupon
): Promise<void> {

  const porcentaje =
    this.porcentajeEditando();


  /*
   * Validación de negocio.
   *
   * La base también tiene un CHECK,
   * pero validamos antes para dar una respuesta
   * más clara desde la aplicación.
   */
  if (
    porcentaje <= 0 ||
    porcentaje > 100
  ) {

    alert(
      'El porcentaje debe ser mayor a 0 y menor o igual a 100.'
    );

    return;
  }


  this.guardando.set(true);


  const actualizado =
    await this.cuponService
      .actualizarCupon(
        cupon.id,
        porcentaje,
        cupon.activo
      );


  this.guardando.set(false);


  if (!actualizado) {

    alert(
      'No se pudo actualizar el cupón.'
    );

    return;
  }


  /*
   * Cerramos la edición.
   */
  this.cuponEditandoId.set(null);


  /*
   * Volvemos a consultar Supabase.
   *
   * Así la pantalla queda sincronizada
   * con el dato realmente guardado.
   */
  await this.cargarCupones();

}

/*
 * =====================================================
 * ACTIVAR / DESACTIVAR CUPÓN
 * =====================================================
 *
 * Cambia el estado actual del cupón.
 *
 * Si está activo:
 * true → false
 *
 * Si está inactivo:
 * false → true
 *
 * No eliminamos el cupón.
 * Solamente decidimos si puede utilizarse.
 */
async cambiarEstado(
  cupon: Cupon
): Promise<void> {

  this.guardando.set(true);


  /*
   * El operador ! invierte un boolean.
   *
   * true  → false
   * false → true
   */
  const nuevoEstado =
    !cupon.activo;


  const actualizado =
    await this.cuponService
      .actualizarCupon(
        cupon.id,
        cupon.porcentaje,
        nuevoEstado
      );


  this.guardando.set(false);


  if (!actualizado) {

    alert(
      'No se pudo cambiar el estado del cupón.'
    );

    return;
  }


  /*
   * Volvemos a consultar Supabase para que
   * la pantalla refleje el dato realmente guardado.
   */
  await this.cargarCupones();

}

}