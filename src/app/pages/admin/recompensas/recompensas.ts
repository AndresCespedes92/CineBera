import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import {
  Recompensa
} from '../../../models/recompensa';

import {
  FidelizacionService
} from '../../../services/fidelizacion';


@Component({
  selector: 'app-recompensas',
  imports: [],
  templateUrl: './recompensas.html',
  styleUrl: './recompensas.css'
})
export class Recompensas implements OnInit {


  /*
   * =====================================================
   * ESTADO DE LA PANTALLA
   * =====================================================
   *
   * Contiene todas las recompensas,
   * incluso las que están desactivadas.
   */
  recompensas =
    signal<Recompensa[]>([]);


  cargando =
    signal<boolean>(true);


  /*
   * Guarda qué recompensa estamos editando.
   *
   * null significa que ninguna se encuentra
   * actualmente en modo edición.
   */
  recompensaEditandoId =
    signal<number | null>(null);


  /*
   * Guarda temporalmente el nuevo valor
   * mientras el administrador lo modifica.
   */
  puntosEditando =
    signal<number>(0);


  guardando =
    signal<boolean>(false);


  constructor(
    private fidelizacionService:
      FidelizacionService
  ) {}


  async ngOnInit(): Promise<void> {

    await this.cargarRecompensas();

  }


  /*
   * =====================================================
   * CARGAR RECOMPENSAS
   * =====================================================
   */
  async cargarRecompensas():
    Promise<void> {

    this.cargando.set(true);


    const recompensas =
      await this.fidelizacionService
        .obtenerRecompensas();


    this.recompensas.set(
      recompensas
    );


    this.cargando.set(false);

  }


  /*
   * =====================================================
   * COMENZAR EDICIÓN
   * =====================================================
   *
   * Guardamos:
   *
   * - qué recompensa estamos editando
   * - cuántos puntos tiene actualmente
   */
  editar(
    recompensa: Recompensa
  ): void {

    this.recompensaEditandoId.set(
      recompensa.id
    );

    this.puntosEditando.set(
      recompensa.puntos_necesarios
    );

  }


  /*
   * Recibimos el valor escrito en el input.
   *
   * $event representa el evento producido
   * por el navegador.
   */
  cambiarPuntos(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    this.puntosEditando.set(
      Number(input.value)
    );

  }


  cancelarEdicion(): void {

    this.recompensaEditandoId.set(null);

    this.puntosEditando.set(0);

  }


  /*
   * =====================================================
   * GUARDAR NUEVO COSTO
   * =====================================================
   */
  async guardar(
    recompensa: Recompensa
  ): Promise<void> {

    const nuevosPuntos =
      this.puntosEditando();


    if (nuevosPuntos <= 0) {

      alert(
        'La cantidad de puntos debe ser mayor a cero.'
      );

      return;

    }


    this.guardando.set(true);


    const resultado =
      await this.fidelizacionService
        .actualizarRecompensa(
          recompensa.id,
          nuevosPuntos,
          recompensa.activo
        );


    this.guardando.set(false);


    if (!resultado) {

      alert(
        'No se pudo actualizar la recompensa.'
      );

      return;

    }


    this.cancelarEdicion();

    await this.cargarRecompensas();

  }


  /*
   * =====================================================
   * ACTIVAR / DESACTIVAR
   * =====================================================
   */
  async cambiarEstado(
    recompensa: Recompensa
  ): Promise<void> {

    const nuevoEstado =
      !recompensa.activo;


    const resultado =
      await this.fidelizacionService
        .actualizarRecompensa(
          recompensa.id,
          recompensa.puntos_necesarios,
          nuevoEstado
        );


    if (!resultado) {

      alert(
        'No se pudo cambiar el estado.'
      );

      return;

    }


    await this.cargarRecompensas();

  }

}