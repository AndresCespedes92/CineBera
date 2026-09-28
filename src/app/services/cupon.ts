import {
  Injectable
} from '@angular/core';

import {
  supabase
} from '../supabase';


/*
 * =====================================================
 * INTERFACE CUPON
 * =====================================================
 *
 * Representa en TypeScript un registro de la
 * tabla "cupones" de Supabase.
 *
 * La interface NO crea datos ni tablas.
 * Simplemente describe qué forma esperamos
 * que tenga un cupón cuando llega del backend.
 */
export interface Cupon {

  id: number;

  nombre: string;

  descripcion: string | null;

  /*
   * Por ahora CineBera admite dos reglas:
   *
   * primera_compra
   * mayor_50
   *
   * Utilizamos un union type para evitar escribir
   * accidentalmente cualquier otro texto.
   */
  tipo:
    | 'primera_compra'
    | 'mayor_50';

  porcentaje: number;

  activo: boolean;

  created_at: string;
}


/*
 * =====================================================
 * CUPON SERVICE
 * =====================================================
 *
 * Su responsabilidad es comunicarse con Supabase
 * para todo lo relacionado con cupones.
 *
 * El componente Checkout NO debería tener consultas
 * directas a la tabla "cupones".
 */
@Injectable({
  providedIn: 'root'
})
export class CuponService {


  /*
   * =====================================================
   * OBTENER CUPÓN POR TIPO
   * =====================================================
   *
   * Ejemplos:
   *
   * obtenerCuponPorTipo('primera_compra')
   *
   * obtenerCuponPorTipo('mayor_50')
   *
   * Solamente recuperamos cupones activos.
   */
  async obtenerCuponPorTipo(
    tipo: Cupon['tipo']
  ): Promise<Cupon | null> {


    const {
      data,
      error
    } =
      await supabase
        .from('cupones')
        .select('*')
        .eq('tipo', tipo)
        .eq('activo', true)
        .maybeSingle();


    /*
     * Si Supabase devuelve un error,
     * lo mostramos para poder depurarlo.
     *
     * Devolvemos null para indicar que
     * no tenemos un cupón utilizable.
     */
    if (error) {

      console.error(
        'Error obteniendo cupón:',
        error
      );

      return null;
    }


    /*
     * maybeSingle() puede devolver:
     *
     * un registro → data contiene el cupón
     * ningún registro → data es null
     *
     * Esto nos viene bien porque un cupón
     * puede estar desactivado.
     */
    return data as Cupon | null;

  }


  /*
   * =====================================================
   * OBTENER TODOS LOS CUPONES
   * =====================================================
   *
   * Este método todavía no lo necesita Checkout.
   *
   * Lo dejamos preparado porque será utilizado
   * por la futura pantalla de administración:
   *
   * Admin → Configuración de cupones.
   */
  async obtenerCupones(): Promise<Cupon[]> {


    const {
      data,
      error
    } =
      await supabase
        .from('cupones')
        .select('*')
        .order(
          'id',
          {
            ascending: true
          }
        );


    if (error) {

      console.error(
        'Error obteniendo cupones:',
        error
      );

      return [];
    }


    return (data ?? []) as Cupon[];

  }

}