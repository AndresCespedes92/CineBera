# Bloque 4 — Reseñas, promedio, Top 3 y filtros

Rama: feature/resenas-ranking, desde main 7e8458a (merge manual del bloque 3).

## Funcionalidad

Una cuenta registrada puede escribir y editar una reseña por película: estrellas enteras de 1 a 5 y comentario obligatorio de 1 a 300 caracteres sin contar espacios exteriores. No se exige compra previa porque la consigna no lo pide. Los visitantes pueden leer; las cuentas anónimas de Auth no escriben. No hay eliminación ni moderación en este bloque.

Las reseñas aparecen en la pantalla de funciones, antes de elegir butacas. El promedio CineBera usa solo estas reseñas, nunca TMDB. La cartelera muestra promedio y cantidad, y distingue películas sin valoraciones.

El Top 3 prioriza las películas de la cartelera vigente según entradas acumuladas, sin límite semanal de ventas. Cuenta cada butaca ocupada asociada a una compra pagada; no cuenta reservas, compras pendientes, canceladas, QR ni productos Candy. Incluye entradas cubiertas por combos o beneficios. Los empates se resuelven por ID ascendente y las películas sin ventas no reciben puesto. Los filtros conservan los puestos originales, no crean un ranking nuevo.

La búsqueda por título ignora tildes, mayúsculas y espacios exteriores. Se combina con el filtro de género y admite todos los géneros de una película. Se conserva la regla de cartelera jueves → miércoles y la navegación de PeliculaCard.

## Archivos y relación entre las partes

- models/resena.ts: contratos de reseña, resumen y ventas.
- services/resena.ts: consultas, validaciones, búsqueda y ordenamiento.
- components/resenas: formulario, promedio y listado con estados de carga/error.
- pages/cliente/home: ranking, valoraciones y filtros, reutilizando PeliculaCard y CSS existente.
- pages/cliente/funciones-pelicula: integra el componente de reseñas antes de las funciones.
- services/pelicula.ts: propaga el error de cartelera para no mostrarlo como lista vacía.
- sql/bloque-4-resenas-ranking.sql: tabla y vistas.
- src/tests/resenas-ranking.spec.ts y tests/resenas-persistencia.sql: pruebas funcionales y persistencia.
- tests/verificar-resenas-rest.mjs: comprobación de lectura pública usando la clave pública existente.

Flujo: Component → ResenaService → Supabase → Service → Component → Template. FormsModule y ngModel enlazan los campos. Input comunica la película al componente hijo; signals mantienen estado y computed deriva reseña propia/promedio. Se conserva Output de PeliculaCard. La inyección de dependencias permite sustituir servicios en las pruebas.

## Base de datos

Migración resenas_ranking aplicada en Supabase el 29/09/2026. No hay SQL manual pendiente ni datos iniciales ficticios.

La clave primaria compuesta (pelicula_id, usuario_id) evita duplicados incluso desde dos pestañas. RLS permite lectura pública, alta propia y edición propia; los permisos de columnas impiden cambiar autor, película o fecha de creación al editar. Las FK enlazan película y usuario. Las restricciones validan estrellas y longitud también fuera de Angular.

resenas_resumen calcula promedio/cantidad en SQL, sin contadores desactualizados. ranking_peliculas calcula las ventas con las relaciones existentes. Ambas vistas son security_invoker: respetan permisos del usuario y no amplían acceso mediante privilegios del creador. Solo se consultan indicadores de las películas mostradas; el ranking devuelve como máximo tres filas. El listado de reseñas se consulta en páginas de 500 para no truncarlo por el límite REST.

## Defensa oral

“El componente coordina la pantalla y el servicio consulta Supabase. Cada usuario tiene una sola reseña por película gracias a una clave compuesta, y RLS impide editar reseñas ajenas. El promedio surge de las estrellas reales. Para el ranking contamos butacas de compras pagadas porque un solo QR puede representar varias entradas. La búsqueda y los géneros filtran la misma colección sin cambiar las reglas de la cartelera.”

## Validación y límites

23 pruebas específicas aprobadas: búsqueda, géneros múltiples, ranking, consultas, errores, promedio, validaciones, sesión, escritura propia y template público. Build de producción correcto; mantiene avisos CommonJS y presupuesto inicial (514,40 kB frente a 500 kB).

Las pruebas SQL son transaccionales y terminan en rollback; verifican permisos, duplicados, restricciones, promedio y compra de dos butacas, excluyendo pendientes/canceladas. No se modifican ventas reales de forma persistente. El script REST comprueba la exposición pública de las nuevas tablas/vistas.

No se repitió la suite general para reducir consumo: en el cierre anterior conservaba 13 errores heredados de compilación, fuera de este bloque. No se realizó validación visual en navegador; no se modificaron estilos ni dependencias.

Los pendientes globales de seguridad del bloque anterior siguen vigentes. Al activar RLS de compras/butacas en el bloque 13 habrá que volver a comprobar el ranking público: una vista security_invoker respeta esas nuevas restricciones. [Guía de vistas y RLS](https://supabase.com/docs/guides/database/postgres/row-level-security#views).

## Reproducir

~~~powershell
npm.cmd test -- --watch=false --ts-config tests/tsconfig.resenas.json --include src/tests/resenas-ranking.spec.ts
npm.cmd run build
node tests/verificar-resenas-rest.mjs
~~~

Entrega para merge manual. Esperar confirmación antes del bloque 5.
