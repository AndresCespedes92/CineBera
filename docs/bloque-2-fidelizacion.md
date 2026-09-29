# Bloque 2 — Fidelización con beneficios reales

## Estado y alcance

Rama: `feature/fidelizacion-beneficios`, creada desde `main` en `80b227f`, después del merge manual del Bloque 1.

Se conserva Component → Service → Supabase. No hay nuevas dependencias, tablas, RPC, triggers ni backend. No se cambiaron estilos ni el diseño general. Los cambios de pago y Candy son los necesarios para utilizar beneficios y acreditar importes efectivamente pagados.

## Cómo funciona

### Canje

Fidelizacion consulta sesión, saldo y recompensas. El servicio relee la recompensa activa y su costo, comprueba saldo y, para Candy, un producto activo configurado. Un único INSERT en `movimientos_puntos` guarda los puntos negativos y el beneficio pendiente con código UUID. Así no puede completarse el descuento sin guardar el beneficio en ese mismo registro.

El nombre y producto quedan guardados como información histórica. Cambiar posteriormente la configuración no cambia un canje existente. La pantalla bloquea nuevos clics mientras procesa. Ante una respuesta incierta se pide consultar el historial antes de repetir.

### Entrada gratis

Desde Mis beneficios se accede a Cartelera. El cliente elige película, función y butacas mediante los flujos existentes. En Pago puede seleccionar un canje pendiente. Una recompensa cubre una entrada: la de menor precio si seleccionó varias. Incluye el recargo VIP de esa entrada y conserva las promociones del resto.

El servicio calcula el importe proporcional al total del checkout: butacas normales y accesibles tienen peso 1; VIP R/S/T tienen peso 1,3. Esto reutiliza el precio final que ya incluye preventa y el descuento aplicable. Por ejemplo, normal + VIP por $18.400 descuenta $8.000; una única VIP por $10.400 queda en cero. El resultado se redondea a centavos.

Un único UPDATE de `compras` guarda estado pagada, total restante, descuento y beneficio utilizado. La FK UNIQUE `beneficio_id` impide utilizar el mismo canje en otra compra. El historial obtiene el estado utilizado desde esa relación, evitando mantener dos estados separados.

Luego se confirman las butacas y se emite la entrada con el QR/código/PDF existente. Una compra ya pagada puede reintentar la emisión sin volver a pagar ni consumir otra recompensa. La confirmación de butacas rechaza reservas vacías o vencidas y comprueba las filas efectivamente actualizadas. Los puntos se calculan sobre el importe pagado; una compra de cero no genera puntos.

### Candy canjeado

La recompensa Candy se configura con un producto y entrega una unidad. El canje muestra código manual y QR `CINEBERA-CANJE:UUID`. El empleado utiliza su pantalla existente de validación: busca el código, revisa el producto y confirma la entrega. No se exige comprar otra entrada para retirar una recompensa.

El UPDATE exige `entregado_at IS NULL` y devuelve la fila modificada. Si otro empleado ya entregó el producto, no se autoriza una segunda entrega. El servicio comprueba una sesión con rol empleado o admin. La entrega de Candy y el ingreso al cine siguen siendo independientes.

### Candy comprado y puntos

Candy se elige desde Checkout antes del pago. El cliente entra con el token de reserva, agrega o elimina productos y vuelve al mismo checkout. El carrito se conserva en sessionStorage, separado por reserva, incluso al recargar. El vencimiento original no se reinicia; se valida otra vez al regresar y al continuar al pago.

Checkout muestra entradas, productos Candy y total conjunto. Al pulsar Ir al pago se prepara la compra pendiente y el pedido Candy con los precios actuales. Si cambió el catálogo se exige revisar la selección. Se puede continuar sin productos o quitar un pedido pendiente anterior. Durante el reemplazo de detalles, el pedido se mantiene cancelado y no puede pagarse ni entregarse; si falla se recupera desde checkout.

Pago muestra el desglose y confirma ambas partes con un solo clic. Para conservar el esquema existente, compras.total sigue representando entradas y pedidos_candy.total representa productos; la interfaz suma ambos. La entrada gratis solo descuenta el importe de entradas. La confirmación sigue siendo simulada y usa escrituras separadas: los reintentos completan el estado pendiente sin volver a aplicar el beneficio.

Solo un pedido pagado puede entregarse. Entradas y Candy acreditan puntos por separado mediante los índices únicos existentes, evitando duplicación. No hay un pago independiente desde la pantalla Candy ni acceso Agregar Candy desde la entrada. El mismo QR sirve para ingreso y retiro, con acciones independientes. El catálogo general sigue visible, pero para seleccionar productos hay que ingresar desde checkout.

## Base de datos

`sql/bloque-2-fidelizacion.sql` fue aplicado a Supabase mediante la migración `fidelizacion_beneficios_reales` el 29/09/2026. **No hay SQL manual pendiente en este proyecto y no debe ejecutarse otra vez.** El archivo documenta el cambio y sirve para otra base equivalente aún sin actualizar.

- `recompensas`: FK al producto Candy.
- `movimientos_puntos`: tipo/nombre/producto/código del beneficio, fecha de entrega y FK al pedido que acredita puntos.
- `compras`: FK única al beneficio y descuento aplicado.
- Índices únicos para acreditaciones, pedido por compra y producto por pedido.
- Se reconoció el canje histórico existente, que ya había descontado puntos.

No se borraron tablas ni datos. Las verificaciones SQL se ejecutaron dentro de una transacción revertida; no quedaron compras o canjes de prueba.

## Relación entre las partes y conceptos Angular

Component → Service → Supabase → Service → Component → Template.

- **Components standalone:** coordinan carga, selección, mensajes y navegación.
- **Services e inyección de dependencias:** concentran consultas y reglas, compartidas entre cliente, administrador y empleado.
- **Interfaces:** Compra, Recompensa y Beneficio expresan los datos y estados esperados.
- **Signals:** saldo, beneficios, estado de carga y procesamiento actualizan el template.
- **computed:** deriva descuento y total al seleccionar una entrada gratis.
- **ngModel y eventos:** comunican la selección del beneficio y los códigos manuales.
- **@if, @for y @empty:** distinguen carga, error, datos y ausencia de resultados.
- **RouterLink/ActivatedRoute:** conservan navegación y parámetros de compra.
- **async/await y try/finally:** esperan datos y liberan controles incluso ante errores.
- **DatePipe y componentes QR existentes:** presentan fechas y códigos sin nuevas librerías.

## Archivos principales

- Modelos: `src/app/models/beneficio.ts`, `compra.ts`, `recompensa.ts`.
- Servicios: `src/app/services/fidelizacion.ts`, `candy.ts`, `butaca.ts`.
- Pantallas y templates: cliente/fidelizacion, cliente/pago, cliente/candy, admin/recompensas, empleado/validar-entrada.
- SQL: `sql/bloque-2-fidelizacion.sql`.
- Pruebas: `src/tests/fidelizacion-beneficios.spec.ts`, `tests/tsconfig.fidelizacion.json`, `tests/fidelizacion-persistencia.sql`, `tests/verificar-beneficios-rest.mjs`.

## Verificación reproducible

```sh
npm test -- --watch=false --ts-config tests/tsconfig.fidelizacion.json --include src/tests/fidelizacion-beneficios.spec.ts
npm test -- --watch=false --ts-config tests/tsconfig.asignacion.json --include src/tests/asignacion-salas.spec.ts
npm run build
```

Las pruebas específicas ejecutan servicios y componentes con transporte Supabase simulado, e interacciones reales de templates mediante TestBed. Cubren saldo insuficiente, recompensa inactiva, otra cuenta, producto faltante, escritura fallida, saldo paginado, importes normales/VIP/promociones, reserva vencida, reutilización, puntos de compras pagadas, Candy, doble clic y recuperación de emisión.

`tests/fidelizacion-persistencia.sql` verificó en la base real: creación de beneficio con débito, uso único, rechazo sin cambios parciales de una segunda utilización, entrega única y acreditaciones independientes sin duplicados. Finaliza con ROLLBACK. `node tests/verificar-beneficios-rest.mjs` comprobó la consulta REST y la relación inversa de compras. No imprime credenciales ni datos personales.

La prueba del scanner verifica el evento y su resultado; no certifica acceso físico a una cámara. No se realizó una compra manual completa con cuentas reales en el navegador.

## Límites conocidos y bloques posteriores

- Dos canjes distintos simultáneos de una misma cuenta pueden consultar el mismo saldo y descontar más puntos de los disponibles. La verificación TypeScript y el bloqueo de botones cubren el flujo normal, no una transacción concurrente de saldo.
- Pago, confirmación de butacas y emisión son llamadas separadas. Los reintentos recuperan fallos intermedios cuando la reserva sigue disponible. Si la reserva vence o se elimina entre pasos, puede requerirse revisión manual; no se presenta este flujo como una transacción integral.
- La creación de cabecera y detalles Candy también consta de dos escrituras. Un fallo puede dejar cabecera pendiente recuperable; nunca habilita entrega sin pago. La edición simultánea de un mismo pedido desde varias pestañas no está coordinada.
- La seguridad completa por RLS y guards pertenece a los bloques 12/13. El asesor de Supabase sigue mostrando las 14 tablas existentes sin RLS, además de avisos de función heredada y protección de contraseñas. Las comprobaciones TypeScript no reemplazan autorización en la base. [Referencia del aviso RLS](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).
- El pago sigue siendo simulado, como en la implementación original. No se integró un proveedor real.
- No se implementaron combos, cancelaciones, crédito ni otros bloques.

## Explicación para la defensa

“El componente muestra el saldo y las recompensas, pero el servicio hace las validaciones y guarda los datos. Cuando canjeamos, guardamos en el mismo movimiento los puntos descontados y el beneficio. Una entrada gratis se elige al pagar y queda asociada a una única compra. Para Candy mostramos un código que el empleado utiliza en su pantalla de entrega. Supabase guarda la utilización y evita repetirla mediante una condición de actualización o una restricción única. Los Signals actualizan la pantalla y computed recalcula el total. Los puntos se acreditan solamente por importes pagados y cada compra o pedido puede acreditarse una sola vez.”

## Resultados del cierre

- Bloque 2: 71/71 pruebas aprobadas (incluye 11 casos del ajuste checkout/Candy).
- Regresión del Bloque 1: 31/31 aprobadas.
- Build de producción: aprobado; bundle inicial 514,22 kB, con warnings preexistentes de budget/CommonJS.
- Suite general: sigue bloqueada por los 13 errores de compilación heredados en specs de directivas, guard y servicios. No se modificaron esos tests.
- SQL de persistencia y consulta REST: aprobados durante la implementación.
- `git diff --check`: sin errores.

La rama se entrega para revisión y merge manual. No se continúa con el Bloque 3 ni se realiza despliegue.

## Ajuste previo al Bloque 3

Se realizó en la misma rama del Bloque 2 porque aún no estaba mergeada en main. Incluye checkout, Candy, pago, eliminación del acceso desde entrada, servicios Compra/Candy y pruebas. No agrega SQL ni dependencias. El carrito es propio de la pestaña; no se sincroniza entre dispositivos. Las escrituras de pago y del pedido siguen sin constituir una transacción conjunta. Build y las 71 pruebas específicas aprobados.
