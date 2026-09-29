# Bloque 11 — Auditoría, etapa 1, y pipe propio

## Alcance de esta entrega

Primera etapa de la división acordada para cuidar el consumo: estructura de persistencia y consulta administrativa. No se conectaron todavía los eventos de creación de funciones, cambios de precios ni validaciones QR. La pantalla informa expresamente que aún no se capturan operaciones. La segunda etapa debe implementar esa captura y sus pruebas antes de declarar terminado el bloque 11.

También se implementó el pedido específico del pipe propio para la hora de entrada.html.

## Pipe horaCorta

Archivo: src/app/pipes/hora-corta.ts. Pipe standalone, puro por defecto, que implementa PipeTransform. El template de entrada usa:

{{ funcionActual.hora | horaCorta }}

Transforma 17:30:00 en 17:30; admite HH:mm, segundos y fracciones de segundos de PostgreSQL. No construye un Date ni convierte zonas horarias. Ante valor nulo, vacío o fuera de formato devuelve un guion largo. Se importa en Entrada y también se reutiliza al generar el PDF para mantener el mismo resultado.

Defensa oral: el pipe encapsula una transformación de presentación reutilizable; el template expresa qué formato necesita sin contener el slice. Al ser puro, Angular vuelve a ejecutarlo cuando cambia su argumento. El método transform recibe la hora de la función y devuelve el texto que verá el usuario.

## Persistencia

Migración auditoria_estructura_consulta aplicada en Supabase. Fuente: sql/bloque-11-auditoria.sql. Tabla public.auditoria con ID, UUID de evento único, UUID del usuario, acción, entidad, ID del elemento, detalles JSON y fecha/hora por defecto del servidor.

Acciones previstas: funcion_creada, precio_modificado, qr_validado. Se limitan las entidades permitidas, el identificador debe ser positivo y detalles debe ser un objeto JSON de hasta 4096 bytes. El UUID del actor se conserva sin FK a auth.users para no borrar la identidad histórica al eliminar una cuenta. No se guardan contraseñas, tokens, QR completos ni perfiles en esta etapa.

RLS habilitado. SELECT solamente para sesiones no anónimas cuyo perfil tenga rol admin. Sin permisos INSERT/UPDATE/DELETE ni acceso a la secuencia para anon/authenticated. El navegador no puede fabricar eventos ni modificar registros. La vía de escritura se definirá junto con la captura en la segunda etapa; no se habilitó una API genérica de inserción desde el cliente.

El índice por acción e ID acompaña el filtro y paginación. No hay SQL manual pendiente para esta etapa.

## Consulta administrativa

/admin/auditoria, enlazada desde el layout administrativo y protegida por roleGuard. AuditoriaService verifica la sesión y el rol, selecciona columnas explícitas, permite filtrar por acción y usa paginación descendente por ID: consulta 51 filas y muestra 50 para detectar la siguiente página.

La pantalla muestra usuario UUID, acción, fecha/hora de Buenos Aires, entidad, ID y detalle desplegable. No ofrece edición ni borrado. Presenta carga, errores, estado vacío y botón Cargar más. Un fallo de página adicional conserva filas y cursor para reintentar sin duplicar. El filtro aplicado se mantiene al cargar más, aunque el campo del formulario cambie sin pulsar Consultar.

Componente standalone con FormsModule, signals, DatePipe, JsonPipe y bloques @if/@for. Reutiliza estilos existentes, sin dependencias nuevas.

## Verificación

- 93 pruebas aprobadas (22 nuevas y 71 de regresión): pipe, template, permisos del servicio, paginación, errores, filtro, renderizado de fechas y escape de detalles, junto con regresión de entradas/fidelización.
- npm.cmd test -- --watch=false --ts-config tests/tsconfig.auditoria.json --include src/tests/auditoria.spec.ts --include src/tests/fidelizacion-beneficios.spec.ts
- npm.cmd run build: correcto; advertencias de CommonJS y presupuesto inicial preexistentes (519,44 kB frente a 500 kB).
- tests/auditoria-permisos.sql ejecutado dentro de BEGIN/ROLLBACK: admin puede leer; sesión sin rol admin y sesión anónima no ven registros; visitantes sin sesión no tienen permiso SELECT; cliente administrativo tampoco puede insertar, editar ni borrar. Datos temporales revertidos.
- node tests/verificar-auditoria-rest.mjs: lectura anónima denegada por la API real.
- git diff --check: sin errores de espacios. No se realizó recorrido manual en navegador.

## Seguridad pendiente

Advisors no agregó hallazgos para auditoria. Persisten 14 tablas preexistentes sin RLS, una función con search_path mutable y la protección de contraseñas filtradas desactivada. La política de auditoría depende del rol de perfiles; mientras esa tabla no tenga sus permisos endurecidos, existe el riesgo heredado de alteración de roles. Esta entrega no significa que toda la aplicación sea segura.

Referencias de remediación: [RLS pendiente](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public) y [search_path de funciones](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).

## Próxima etapa

Conectar creación de funciones, cambios de precio y validaciones de entrada/Candy/beneficios con eventos que identifiquen al actor y al elemento. Definir persistencia e idempotencia para evitar registrar éxitos falsos o duplicados al reintentar y comprobar que fallos de auditoría no queden ocultos. No cargar eventos históricos inventados. Retirar el aviso de etapa incompleta únicamente cuando la captura esté verificada.
