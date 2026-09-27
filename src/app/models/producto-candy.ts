/*
 * Representa un producto disponible
 * en el Candy de CineBera.
 *
 * Esta interface define la forma que
 * esperamos que tenga un producto
 * dentro de nuestra aplicación Angular.
 */
export interface ProductoCandy {

  /*
   * Identificador único del producto
   * generado por Supabase.
   */
  id: number;


  /*
   * Categoría a la que pertenece.
   *
   * Ejemplo:
   * 2 → Bebidas
   */
  categoriaId: number;


  nombre: string;


  /*
   * Puede no existir, por eso usamos
   * string | null.
   */
  descripcion: string | null;


  precio: number;


  /*
   * La imagen también es opcional.
   */
  imagenUrl: string | null;


  /*
   * Permite realizar una baja lógica
   * sin eliminar el producto.
   */
  activo: boolean;
}