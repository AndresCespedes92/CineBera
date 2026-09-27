import { Injectable } from '@angular/core';

import { supabase } from '../supabase';
import { Entrada } from '../models/entrada';


@Injectable({
  providedIn: 'root'
})
export class EntradaService {


  /*
   * Genera un código manual corto.
   *
   * Este código será una alternativa al QR.
   * Por ejemplo:
   *
   *   A7K3P9XZ - private significa que este método es una herramienta interna del servicio
   *
   * No reemplaza al UUID del QR.
   * Es solamente una forma más cómoda para
   * que un empleado pueda escribirlo manualmente.
   */
  private generarCodigoManual(): string {

    return crypto
      .randomUUID()
      .replaceAll('-', '')
      .substring(0, 8)
      .toUpperCase();

  }


  /*
   * Crea una entrada asociada a una compra.
   *
   * Supabase genera automáticamente:
   *
   * - id
   * - codigo UUID
   * - utilizada = false
   * - created_at
   *
   * Nosotros solamente enviamos:
   *
   * - compra_id
   * - codigo_manual
   */
  async crearEntrada(
    compraId: number
  ): Promise<Entrada | null> {

    const codigoManual =
      this.generarCodigoManual();


    const { data, error } = await supabase
      .from('entradas')
      .insert({
        compra_id: compraId,
        codigo_manual: codigoManual
      })
      .select()
      .single();


    if (error) {

      console.error(
        'Error al crear la entrada:',
        error
      );

      return null;

    }


    return data;

  }


  /*
   * Busca la entrada correspondiente a una compra.
   *
   * Nos servirá para evitar crear dos entradas
   * si el usuario recarga la pantalla después
   * de haber realizado el pago.
   */
  async obtenerEntradaPorCompra(
    compraId: number
  ): Promise<Entrada | null> {

    const { data, error } = await supabase
      .from('entradas')
      .select('*')
      .eq('compra_id', compraId)
      .maybeSingle();


    if (error) {

      console.error(
        'Error al buscar la entrada:',
        error
      );

      return null;

    }


    return data;

  }

  /*
 * Busca una entrada utilizando su código público.
 *
 * Este código será el que aparezca en la URL
 * y posteriormente será también la referencia
 * utilizada por el QR.
 */
async obtenerEntradaPorCodigo(
  codigo: string
): Promise<Entrada | null> {

  const { data, error } = await supabase
    .from('entradas')
    .select('*')
    .eq('codigo', codigo)
    .maybeSingle();


  if (error) {

    console.error(
      'Error al buscar la entrada por código:',
      error
    );

    return null;

  }


  return data;

}

}