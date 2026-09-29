# Bloque 10 — Gráficos de ventas

## Resultado

Ruta /admin/graficos con enlace Gráficos en el layout administrativo. Permite elegir una fecha y consultar su semana (lunes a domingo) o su mes calendario. Muestra hasta diez películas y diez productos Candy ordenados por cantidad descendente, con desempate por nombre y luego ID. Las barras SVG nativas comparan cada cantidad con el máximo del gráfico. Cada resultado también presenta nombre y cantidad como texto accesible; los SVG decorativos se ocultan a lectores de pantalla.

No se agregaron dependencias, estilos CSS, migraciones ni escrituras de datos. Se reutiliza la hoja de estilos administrativa. La nueva ruta utiliza lazy loading y hereda roleGuard; el servicio comprueba usuario registrado y perfil admin antes de consultar.

## Criterios de negocio

Películas más vistas: cantidad de butacas ocupadas asociadas a compras actualmente pagadas, agrupadas por película y por fecha de la función. El vínculo a la compra exige coincidencia de función y token de reserva. Se incluyen entradas obtenidas mediante beneficios y ventas anticipadas para funciones del período. No se interpreta este valor como asistencia comprobada por QR. Las butacas sin compra pagada asociada quedan fuera y no se estiman entradas faltantes.

Candy más vendido: cantidad total de unidades en detalles de pedidos pagados cuya compra también sigue pagada, agrupadas por ID del producto. Se utiliza pagada_at de la compra en Buenos Aires (UTC-03), con inicio inclusive y final exclusive. cantidad ya incluye unidades de combos: cantidad_combo no se suma nuevamente. Los canjes gratuitos no constituyen ventas Candy. Se conservan ventas de productos hoy inactivos y películas hoy ocultas; no se aplica el filtro del catálogo actual a datos históricos.

El período de películas depende de la fecha de función; el de Candy depende del pago. Esta diferencia figura en la pantalla y explica por qué los gráficos no son una descomposición directa del reporte de facturación. El gráfico es un ranking de cantidades, no de importes.

Los filtros se aplican al pulsar Consultar gráficos. El encabezado conserva el período del resultado aunque luego cambien los campos. Durante la carga se bloquea el formulario; ante un fallo se limpian los resultados y se ofrece reintentar. Los períodos vacíos muestran mensajes sin inventar ganadores. Los empates se mantienen con su cantidad visible; el texto del máximo aclara que puede haber varios productos empatados.

## Consultas y límites

Todas las consultas se paginan por ID en lotes de 500; las comprobaciones de compras utilizan grupos de 100 tokens únicos. Las butacas se cuentan una vez y los productos/películas se agrupan por ID, aunque compartan nombre. Los joins reales con funciones, películas, productos, pedidos y compras se verificaron contra Supabase.

La lectura de varias tablas no es una instantánea transaccional; pagos o cancelaciones concurrentes pueden requerir volver a consultar. Las cancelaciones posteriores modifican los rankings históricos. Los nombres reflejan el catálogo actual. Persisten las limitaciones de datos incompletos y RLS de las tablas preexistentes, documentadas en los bloques anteriores; los guards y controles TypeScript no sustituyen autorización en la API.

## Verificación

47 pruebas aprobadas: 24 de gráficos y 23 de regresión de reportes. Cubren semanas que cruzan mes/año, domingos, meses bisiestos, fechas inválidas, permisos, agrupación por película, múltiples butacas, exclusión de compras no pagadas, coincidencia de función/token, cantidades Candy y combos, empates, páginas de 501 registros, lotes de tokens, datos vacíos, fallos, ruta protegida y ancho/etiquetas de las barras.

Comando: npm.cmd test -- --watch=false --ts-config tests/tsconfig.graficos.json --include src/tests/graficos.spec.ts --include src/tests/reportes.spec.ts

npm.cmd run build: correcto. Continúan advertencias de CommonJS y presupuesto inicial (518,82 kB frente a 500 kB).

node tests/verificar-graficos-rest.mjs: comprobación real de septiembre de 2026. Coincidió con una agregación SQL independiente: película 7 con 3 entradas, película 8 con 2; producto 11 con 2 unidades y producto 14 con 4. No se insertaron ni modificaron datos.

git diff --check: sin errores de espacios. No se hizo un recorrido manual en navegador; el componente y sus SVG se verificaron mediante el renderizado de Angular en pruebas. Se mantuvo la configuración focalizada porque las specs generales generadas conservan errores heredados.

## Archivos y defensa oral

models/grafico.ts define los resultados. EstadisticaService valida fechas y permisos, pagina consultas y acumula cantidades con Map y Set. El componente standalone Graficos usa FormsModule/ngModel para filtros, signals para carga/error/resultados y @if/@for para presentar los datos. Las barras se dibujan con SVG y binding de atributos, sin una librería de gráficos. La lógica de fechas reutiliza la validación del bloque de reportes; las pruebas de ese bloque se ejecutaron como regresión.
