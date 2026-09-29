# Bloque 11 — Auditoría completa y pipe propio

## Resultado

/admin/auditoria muestra creación de funciones, cambios de precio y confirmaciones de ingreso/retiro, con usuario UUID, acción, fecha/hora de Buenos Aires, entidad, ID y detalles mínimos. Permite filtrar por acción y cargar páginas de 50 registros ordenadas por ID descendente. El cliente no ofrece ni tiene permisos para insertar, editar o borrar eventos.

Las dos etapas están implementadas. La captura comienza desde la aplicación de la segunda migración: no se inventaron eventos históricos. La pantalla ya no muestra el aviso de etapa pendiente.

## Pipe horaCorta

src/app/pipes/hora-corta.ts implementa PipeTransform en un pipe standalone puro. entrada.html utiliza {{ funcionActual.hora | horaCorta }}. Transforma 17:30:00 en 17:30; admite HH:mm, segundos y fracciones de segundos. No convierte zonas horarias. Datos vacíos o inválidos producen un guion largo. El PDF de la entrada reutiliza la misma transformación.

## Captura de eventos

| Operación | Registro |
| --- | --- |
| INSERT de función | funcion_creada: película, sala, fecha y hora |
| Cambio de precio de película | precio_modificado: preventa y venta, valores anteriores y nuevos |
| Cambio de precio de producto Candy | precio_modificado: valor anterior y nuevo |
| Cambio de precio de combo | precio_modificado: valor anterior y nuevo |
| Entrada pasa a utilizada | qr_validado: ingreso, ID de compra |
| Pedido Candy pasa a entregado | qr_validado: retiro_candy, ID de compra |
| Beneficio Candy pasa a entregado | qr_validado: retiro_beneficio_candy, ID de producto |

Consultar/escanear un código no confirma la operación: se audita al confirmar ingreso o retiro, tanto por QR como por código manual. No se almacenan el QR, tokens de reserva, contraseñas ni códigos de canje.

Guardar un precio idéntico, volver a actualizar una entrada ya utilizada o reintentar una entrega ya confirmada no añade eventos. Los nuevos precios iniciales de productos/combos no se consideran modificaciones. Los eventos de creación de función corresponden a filas nuevas reales; si el cliente inserta otra función después de una respuesta de red perdida, esa segunda fila también se registra. La auditoría no deduplica solicitudes de programación ni reemplaza la lógica de asignación de salas.

## Por qué se utilizan triggers

Una función de trigger pequeña despacha siete eventos y escribe la auditoría en la misma transacción que el cambio. Si no puede insertarse el evento, la operación se revierte. Evita el problema de guardar primero la operación y perder luego el registro por un corte de red. No se agregaron RPC, endpoints ni bibliotecas, y la asignación de salas sigue en TypeScript.

La función está en el esquema privado auditoria_interna, con SECURITY DEFINER, search_path vacío, referencias de tabla calificadas y EXECUTE revocado a public/anon/authenticated. No se expone una función llamable por el navegador. Este privilegio permite al trigger escribir sin conceder INSERT directo sobre auditoria. El actor se obtiene de auth.uid() y el rol se comprueba en perfiles: admin para funciones/precios; admin o empleado para ingreso/retiro. Se rechazan sesiones anónimas o sin actor.

Los triggers de entrada y pedido comprueban además que la compra esté pagada; Candy requiere pedido pagado. Se captura solamente una transición de no entregado a entregado. Si una operación devuelve un fallo de persistencia, la pantalla de validación no autoriza el ingreso y libera su estado de procesamiento para reintentar. Se bloquean confirmaciones simultáneas en esa pantalla.

## Base de datos y permisos

Migraciones aplicadas: auditoria_estructura_consulta y auditoria_captura_eventos. Fuentes: sql/bloque-11-auditoria.sql y sql/bloque-11-auditoria-eventos.sql. No queda SQL manual pendiente.

public.auditoria conserva ID, UUID de evento único, UUID del actor, acción, entidad, ID afectado, detalles JSON y fecha/hora del servidor. El actor se conserva aunque se elimine su cuenta. Se restringen acciones, entidades, ID positivo y detalles como objeto JSON de hasta 4096 bytes. RLS permite SELECT solo a administradores registrados; no hay permisos de escritura de cliente ni acceso a la secuencia. Índice por acción e ID para paginación.

Las operaciones administrativas ejecutadas manualmente por SQL también requieren contexto de actor si afectan estos campos. Las tareas de mantenimiento deben realizarse con un contexto de personal explícito, no con un usuario inventado ni deshabilitando triggers para eludir auditoría.

## Verificación

- 193 pruebas aprobadas: auditoría/pipe (25), fidelización/entradas (71), crédito/cancelaciones (30), combos (36), asignación de salas (31).
- npm.cmd test -- --watch=false --ts-config tests/tsconfig.auditoria.json --include src/tests/auditoria.spec.ts --include src/tests/fidelizacion-beneficios.spec.ts --include src/tests/credito.spec.ts --include src/tests/combos.spec.ts --include src/tests/asignacion-salas.spec.ts
- npm.cmd run build: correcto, con advertencias heredadas de CommonJS y presupuesto inicial (519,44 kB frente a 500 kB).
- tests/auditoria-permisos.sql: permisos y RLS comprobados en la primera etapa.
- tests/auditoria-eventos.sql: ejecutado en Supabase con BEGIN/ROLLBACK. Verifica siete eventos reales, importes anteriores/nuevos, actor admin/empleado, ausencia de códigos secretos, reintentos sin duplicados, denegación de cambios de precio al empleado y sin sesión, lectura restringida, función no ejecutable por cliente y reversión del precio cuando se fuerza un fallo de inserción del evento. Datos, roles temporales y restricción de prueba revertidos al finalizar.
- tests/verificar-auditoria-rest.mjs: API anónima denegada, comprobada en la primera etapa.
- git diff --check: sin errores de espacios. No se realizó recorrido manual en navegador.

## Límites pendientes del bloque de seguridad

Advisors no agregó hallazgos para auditoria ni auditoria_interna. Persisten 14 tablas preexistentes sin RLS, una función con search_path mutable y protección de contraseñas filtradas desactivada. La autorización depende del rol de perfiles: mientras esa tabla no esté protegida, existe el riesgo heredado de alteración de roles. Tampoco se pretende impedir que un administrador de base de datos modifique registros.

Los triggers auditan las operaciones enumeradas, no todas las escrituras posibles ni intentos fallidos. La atomicidad cubre cambio y evento dentro de una misma sentencia; no convierte los flujos completos de compra, cancelación y validación en una transacción global ni elimina sus carreras preexistentes.

Referencias: [RLS pendiente](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public) y [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).

## Defensa oral

El componente standalone usa FormsModule, signals, DatePipe, JsonPipe y @if/@for. AuditoriaService solo consulta y pagina; la base registra cambios reales mediante triggers después de la operación, dentro de la misma transacción. El pipe propio encapsula el formato de hora para evitar duplicarlo en el template y el PDF. La auditoría incluye el actor, el elemento y los datos mínimos necesarios para explicar qué cambió.
