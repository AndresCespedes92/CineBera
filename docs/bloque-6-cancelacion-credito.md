# Bloque 6 — Cancelación, crédito y pago mixto

Rama feature/cancelacion-credito desde main 1f1dded. Las tres etapas se entregan juntas. Migración cancelacion_credito aplicada en Supabase; fuente: sql/bloque-6-cancelacion-credito.sql. No hay SQL manual pendiente.

## Reglas y uso

Desde Mis películas se solicita y confirma cancelar toda una compra. Se permite hasta exactamente dos horas antes de la función (hora de Buenos Aires). Menos de dos horas, entrada utilizada o Candy entregado: rechazo. No hay cancelación parcial ni devolución de dinero.

Se anulan entradas y Candy de la compra, se liberan sus butacas y se acredita el importe neto pagado: compras.total más extras Candy pagados. El combo ya está incluido en compras.total, por eso no se duplica. Si hubo pago mixto, el reintegro incluye también el crédito utilizado: se devuelve el valor total de la compra, no solo el dinero adicional. Una parte gratuita no genera crédito. Los canjes de entrada gratis consumidos no se restituyen. Las compras anónimas no tienen cuenta a la cual acreditar.

Si el pago de Candy quedó incompleto, se pide completarlo desde Pago antes de cancelar. La cancelación registra una copia de su reintegro antes de cambiar Candy. El historial conserva canceladas y permite completar una cancelación interrumpida. También muestra pagos pendientes para recuperar reservas con crédito que quedaron sin terminar.

Al pagar, el usuario elige usar crédito. Se aplica hasta el menor entre saldo y total neto (entradas, combos y extras, después del beneficio elegido). El resto usa el pago simulado existente del TP. El crédito no reduce compras.total: es un medio de pago, no otro descuento.

Si se reservó crédito pero falló la confirmación, el movimiento permanece vinculado a esa compra. Un reintento lo reutiliza; no vuelve a descontarlo. El usuario puede anular esa reserva para recuperar solo el importe reservado. No se permite modificar el checkout después de reservar crédito. Un importe total cero no crea movimientos monetarios de valor cero.

Los puntos acreditados por la compra y Candy se revierten una sola vez. Si ya se gastaron, el saldo de puntos puede quedar negativo y no permite nuevos canjes hasta recuperarlo; no se generan puntos gratis por cancelar y recomprar.

## Componentes y datos

- CreditoService concentra saldo, movimientos y cancelación, con TypeScript, async/await y llamadas Supabase.from.
- Pago muestra crédito/restante y coordina su aplicación con el flujo existente de beneficios, Candy, butacas y emisión.
- MisPeliculas ofrece confirmación de cancelación, saldo e intentos de recuperación.
- CompraService conserva pagadas, canceladas y pendientes en el historial e impide cambiar un checkout con crédito reservado.
- EntradaService comprueba compra pagada en búsquedas QR/código y antes de validar. CandyService comprueba el estado antes de entregar. El template/PDF de entrada no presentan una compra cancelada como válida al cargar su estado actual.
- Modelos Compra, PeliculaComprada y MovimientoPuntos incorporan los estados/datos necesarios.

No se agregaron librerías, RPC, funciones PostgreSQL, triggers ni backend. Se reutilizan los estilos existentes.

## Cómo se evita duplicar o gastar dos veces el crédito

movimientos_credito es un historial inmutable con importe, saldo anterior, saldo resultante y referencia al movimiento anterior. Cada fila se inserta de una vez. CHECK impide saldo negativo y exige que saldo = saldo_anterior + monto. Una FK compuesta exige que el usuario y saldo anterior coincidan con el movimiento referenciado. UNIQUE impide dos sucesores del mismo movimiento, dos inicios de cuenta y dos movimientos del mismo tipo para una compra.

Así, dos pagos concurrentes que leyeron el mismo saldo no pueden crear dos sucesores válidos. El servicio relee y reintenta hasta tres veces ante conflicto de unicidad. Si el saldo ya no alcanza, rechaza. Un reintento con igual compra/tipo/importe reconoce la operación previa como confirmada.

RLS permite leer e insertar solamente movimientos propios, con importes vinculados a compras propias. No hay UPDATE/DELETE para clientes. Las cancelaciones guardan cancelada_at, credito_reintegro y cancelacion_completa en compras. La reversión de puntos usa tipo cancelacion con índice único por compra.

## Angular y defensa

Component → CreditoService → Supabase → Component → Template. Signals mantienen saldo, crédito reservado, procesamiento y confirmación; computed deriva crédito aplicado y restante sin alterar el precio de compra. FormsModule/ngModel enlaza la opción de crédito, RouterLink permite recuperar pagos y @if muestra estados diferenciados.

“Cancelar cambia el estado de la compra y conserva el importe a reintegrar. Después libera las butacas, anula Candy, revierte puntos y registra crédito. Cada paso puede reintentarse y los índices únicos evitan duplicados. Para pagar usamos el crédito como medio de pago: el precio sigue siendo el mismo y solo cambia cuánto resta pagar. Cada movimiento de saldo tiene un único sucesor, así dos pestañas no pueden gastar el mismo saldo anterior.”

## Verificación

150 pruebas aprobadas: 30 de crédito/cancelación/pago mixto, 36 de combos, 71 de fidelización y 13 de historial. Incluyen límite exacto de dos horas, rechazo fuera de plazo, entrada usada/Candy entregado, crédito parcial/completo, saldo insuficiente, reintentos, respuesta perdida, cancelación incompleta y QR/Candy cancelados.

Prueba real tests/credito-persistencia.sql ejecutada con rollback: doble reintegro, bifurcación de saldo, saldo negativo, saldo anterior inventado, reinicio de cuenta, edición de movimientos, importe de reintegro alterado y acceso ajeno. Todas las fixtures se revirtieron. tests/verificar-credito-rest.mjs valida columnas y consulta QR por REST sin descargar datos personales.

Build de producción correcto con los avisos de presupuesto inicial/CommonJS existentes. No se repitió la suite general: conserva los errores heredados informados antes. No se ejecutó una sesión manual completa en navegador ni una lectura física con cámara.

~~~powershell
npm.cmd test -- --watch=false --ts-config tests/tsconfig.credito.json --include src/tests/credito.spec.ts --include src/tests/combos.spec.ts --include src/tests/fidelizacion-beneficios.spec.ts --include src/tests/mis-peliculas.spec.ts
npm.cmd run build
node tests/verificar-credito-rest.mjs
~~~

## Límites conocidos

La protección del saldo por FK/UNIQUE no convierte la cancelación, emisión, puntos y entrega en una transacción global. Son escrituras separadas recuperables. Una carrera exacta entre cancelar y pagar/validar/entregar sigue siendo una limitación académica: las comprobaciones de estado se hacen antes de cada operación. No se afirma atomicidad entre esas tablas.

La tabla nueva tiene RLS; permanecen 14 tablas anteriores sin RLS, incluidas compras y perfiles. Por ello las restricciones del nuevo historial no sustituyen la protección integral de las compras frente a manipulación directa de API. Ese endurecimiento corresponde al bloque 13. [Referencia de RLS](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public). El advisor también mantiene los avisos previos de [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) y [contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Entregar la rama para merge manual y esperar confirmación antes del bloque 7.
