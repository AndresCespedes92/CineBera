# Bloque 9 — Reportes de ventas

## Alcance

/admin/reportes permite consultar un período de hasta 366 días inclusive y descargar el mismo resultado como PDF o Excel XML. Hay acceso desde el panel existente y desde la navegación administrativa. La ruta hereda roleGuard y el servicio verifica sesión registrada y perfil admin antes de consultar.

Se reutilizaron estilos administrativos y jsPDF. No se agregaron dependencias ni se modificaron estilos. No hay migraciones ni SQL manual pendiente.

## Criterios de cálculo

- Fecha: pagada_at de la compra, interpretada en Buenos Aires (UTC-03), desde medianoche inclusive hasta la medianoche posterior al último día exclusive. No se usa fecha de creación ni fecha de función.
- Compras: únicamente estado actual pagada. Canceladas y pendientes quedan fuera. Una cancelación posterior cambia también el reporte del período original; no es un cierre contable inmutable.
- Entradas: butacas_funcion ocupadas, asociadas por reserva_token y funcion_id. Un QR puede representar varias butacas. Los beneficios de entrada gratuita también cuentan como entradas confirmadas.
- Entradas/combos: compras.total ya persistido después de descuentos. No se vuelve a restar el beneficio ni a sumar el combo.
- Candy extra: pedidos_candy.total solamente cuando su estado es pagado; excluye los productos incluidos en combos porque su subtotal adicional ya es cero.
- Total: entradas/combos + Candy extra. Las ventas abonadas con crédito mantienen su valor. Es facturación de ventas vigentes, no dinero cobrado en caja ni factura fiscal.
- Los importes se acumulan en centavos enteros y se convierten a pesos al finalizar. Se incluyen días sin ventas con valores cero.

Se pagina por ID en lotes de 500; las consultas de butacas se dividen en grupos de 100 tokens y también se paginan. Se evita truncar al límite habitual de Supabase. Ante un error se rechaza el reporte completo; la pantalla limpia resultados anteriores para no presentar cifras parciales como válidas.

## Exportaciones

Ambas exportan el período efectivamente consultado, incluso si luego se editan los filtros sin pulsar Consultar. Incluyen fecha de generación UTC, criterio de cálculo, detalle diario y totales.

PDF usa jsPDF mediante importación dinámica, columnas alineadas, varias páginas y encabezado repetido. Excel utiliza SpreadsheetML 2003, descargado con extensión .xml e identificado como Excel (XML). Es un formato de libro compatible con Excel, no un archivo .xlsx ni un CSV renombrado. Los importes son celdas numéricas con dos decimales y el texto se escapa como XML. Puede abrirse desde Excel y guardarse como .xlsx si se necesita ese formato.

## Datos incompletos y límites

Se detectaron tres compras actualmente pagadas sin butacas ocupadas asociadas en septiembre de 2026. El reporte muestra esa cantidad como advertencia y la incluye en PDF y Excel; conserva el importe registrado y no inventa entradas. No se modificaron datos históricos.

La consulta de septiembre contrastada mediante SQL y REST devolvió: 9 compras, 6 entradas confirmadas, ARS 806,50 en entradas/combos, ARS 12.800,00 en Candy extra y ARS 13.606,50 de total. Son los datos existentes del entorno, no cifras introducidas por este bloque.

La lectura de compras y butacas ocurre en consultas separadas, por lo que no constituye una instantánea transaccional si hay pagos o cancelaciones simultáneos. Un pago parcialmente completado puede mostrar temporalmente compras sin butacas o Candy todavía pendiente; puede volver a consultarse después de completar el flujo. El control RLS de las tablas preexistentes sigue pendiente del bloque de seguridad; los controles de Angular no sustituyen autorización en la API.

## Verificación

- 23 pruebas focalizadas: fechas, medianoche de Buenos Aires, año bisiesto, permisos, errores, centavos, Candy, cantidad de entradas, paginación de compras y butacas, reporte vacío, XML válido con tipos numéricos, PDF real multipágina, advertencia de datos incompletos, guard y presentación del período consultado.
- npm.cmd test -- --watch=false --ts-config tests/tsconfig.reportes.json --include src/tests/reportes.spec.ts
- npm.cmd run build: correcto, con advertencias heredadas de presupuesto inicial y CommonJS.
- node tests/verificar-reportes-rest.mjs: consultas de septiembre verificadas contra la API real y contrastadas con agregación SQL independiente.
- git diff --check: sin errores de espacios.
- No se recorrió manualmente la pantalla en navegador ni se abrió el XML en Microsoft Excel. La prueba del PDF verifica documento válido, páginas, encabezados y valores; no sustituye inspección visual de impresión.
- Las specs generales generadas conservan sus errores heredados; se utilizó configuración focalizada para este bloque.

## Archivos y defensa oral

El modelo reporte.ts define filas, totales y metadatos. ReporteService valida período y sesión, consulta datos paginados y agrupa por fecha. exportar-reporte.ts comparte la transformación de filas para mantener consistencia entre archivos. El componente standalone Reportes utiliza FormsModule/ngModel, signals, bloques @if/@for y DecimalPipe. La ruta utiliza lazy loading. El servicio no altera compras, pagos ni movimientos de crédito: solamente consulta y resume datos existentes.
