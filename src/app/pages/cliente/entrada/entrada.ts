import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { EntradaService } from '../../../services/entrada';
import { Entrada as EntradaModel } from '../../../models/entrada';


@Component({
  selector: 'app-entrada',
  standalone: true,
  imports: [],
  templateUrl: './entrada.html',
  styleUrl: './entrada.css'
})
export class Entrada implements OnInit {


  /*
   * Estado reactivo de la entrada.
   *
   * Al comenzar todavía no tenemos datos,
   * por eso el valor inicial es null.
   */
  entrada = signal<EntradaModel | null>(null);


  /*
   * Nos permite diferenciar:
   *
   * "todavía estoy consultando Supabase"
   *
   * de
   *
   * "terminé de consultar pero no encontré nada".
   */
  cargando = signal<boolean>(true);


  constructor(
    private route: ActivatedRoute,
    private entradaService: EntradaService
  ) {}


  async ngOnInit(): Promise<void> {

    /*
     * Leemos el parámetro dinámico :codigo
     * definido en app.routes.ts.
     */
    const codigo =
      this.route.snapshot.paramMap.get('codigo');


    /*
     * Una URL sin código no representa
     * una entrada válida.
     */
    if (!codigo) {

      this.cargando.set(false);

      return;

    }


    /*
     * Delegamos al servicio la consulta
     * correspondiente a Supabase.
     */
    const entradaEncontrada =
      await this.entradaService.obtenerEntradaPorCodigo(
        codigo
      );


    /*
     * Guardamos el resultado en el Signal.
     *
     * Angular actualizará automáticamente
     * el HTML que lea entrada().
     */
    this.entrada.set(
      entradaEncontrada
    );


    this.cargando.set(false);

  }

}