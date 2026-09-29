# Bloque 5 — Mis películas

Rama feature/mis-peliculas desde main 3984c8e, después del merge manual del bloque 4.

## Qué se implementó

El enlace existente de la navbar ahora abre /mis-peliculas mediante lazy loading y authGuard. El historial muestra una tarjeta por compra pagada del usuario registrado: póster, título, fecha/hora de la función y su calificación CineBera cuando exista. Permite abrir la entrada/QR y navegar a las reseñas para calificar o editar.

Incluye funciones futuras y pasadas; no afirma que todas hayan sido vistas. Ordena por compra más reciente (ID descendente). Una compra con varias butacas produce una tarjeta; compras distintas de la misma película permanecen separadas porque tienen entradas/fechas propias. La reseña sigue siendo única por usuario/película.

No muestra compras pendientes, canceladas o anónimas. No agrega una compra anónima al historial al iniciar sesión posteriormente. No incorpora cancelación ni crédito: corresponden al bloque 6.

## Archivos y arquitectura

- src/app/models/pelicula-comprada.ts: modelo de tarjeta y página del historial.
- src/app/services/compra.ts: obtenerMisPeliculas verifica el usuario con Auth, consulta sus compras pagadas y relaciona funciones/películas/entradas mediante FK. Luego obtiene sus reseñas para las películas de esa página en una sola consulta.
- src/app/pages/cliente/mis-peliculas: componente y template, reutilizando Navbar y el CSS de la cartelera.
- src/app/app.routes.ts: ruta protegida y carga diferida.
- src/tests/mis-peliculas.spec.ts y tests/tsconfig.mis-peliculas.json: pruebas focalizadas.
- tests/verificar-mis-peliculas-rest.mjs: comprueba las consultas REST con un UUID sin usuario, sin descargar historiales personales.

Component → CompraService → Supabase → modelo de historial → signals → template. No se duplican datos en tablas nuevas ni se generan entradas nuevas.

## Conceptos Angular y defensa

Standalone Component permite declarar sus dependencias. DI entrega CompraService. OnInit carga el historial. Signals actualizan carga, error, tarjetas y cursor. @if distingue carga/error/vacío y @for usa compraId para identificar cada tarjeta. DatePipe muestra fecha local de función sin tratarla como fecha UTC. RouterLink reutiliza las rutas de entrada y reseña. CanActivate reutiliza authGuard; el servicio además rechaza cuentas anónimas de Auth. Lazy loading evita cargar esta pantalla hasta navegar a ella.

“Mis películas no tiene una tabla propia: es una vista de las compras pagadas del usuario. Cada compra se relaciona con su función, película y entrada, y agregamos la calificación que ese mismo usuario ya escribió. Cargamos veinte compras por vez y usamos el ID de la última como cursor para que una compra nueva no repita las tarjetas de las páginas anteriores.”

## Paginación y errores

Se solicitan 21 filas para mostrar 20 y saber si hay otra página. La siguiente consulta usa id menor que el último mostrado, con el mismo filtro de usuario. Las reseñas se consultan por los IDs únicos de esa página. Actualizar reinicia el historial. Un error al cargar más conserva lo ya mostrado y permite reintentar el cursor. Los errores de reseñas no se presentan como ausencia de calificación. Relaciones o póster ausentes tienen mensajes de respaldo.

## Verificación

13 pruebas focalizadas aprobadas: usuario/estado, visitantes y cuentas anónimas, cursor inválido, historial vacío, fallos de consultas, relaciones ausentes, paginación, guard/lazy loading, reintento y render de póster/fecha/calificación/enlaces. REST comprobado con las relaciones reales de Supabase. Build de producción correcto con las advertencias de presupuesto/CommonJS ya presentes.

~~~powershell
npm.cmd test -- --watch=false --ts-config tests/tsconfig.mis-peliculas.json --include src/tests/mis-peliculas.spec.ts
npm.cmd run build
node tests/verificar-mis-peliculas-rest.mjs
~~~

No se repitió la suite general, que en bloques anteriores conserva 13 errores de compilación heredados. No se realizó una sesión manual completa en navegador. No hubo cambios de estilos, dependencias ni esquema; SQL manual pendiente: ninguno.

## Riesgos conocidos

El servicio filtra por el usuario validado y la ruta exige sesión, pero esto no sustituye RLS. Compras/entradas y otras tablas mantienen la configuración heredada sin RLS; su protección integral y las pruebas de aislamiento directo de API corresponden al bloque 13. Este bloque no declara resuelto ese pendiente.

Entrega para merge manual. Esperar confirmación antes del bloque 6.
