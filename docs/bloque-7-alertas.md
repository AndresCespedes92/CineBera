# Bloque 7 — Alertas de próximos estrenos

Rama feature/alertas-estrenos desde main 9fe41ba. Migración alertas_estrenos aplicada en Supabase. SQL manual pendiente: ninguno.

## Mecanismo elegido

Aviso interno persistente, sin correo ni push externo. La consigna pide una solución simple y no especifica un proveedor. Se consultó si se exigía aplicación cerrada; se avanzó con la opción interna comunicada durante el trabajo.

El usuario registrado activa “Avisarme cuando haya entradas” en Próximamente. La preferencia persiste por usuario/película. Puede desactivarla y volver a activarla mientras la película siga siendo futura y visible.

Al cargar una pantalla con Navbar, al abrir Mis alertas o al pulsar Actualizar alertas, el servicio consulta la disponibilidad real. Si la venta se habilitó, guarda notificada_at una sola vez y deja leida=false. La barra muestra el número de avisos nuevos. Mis alertas ofrece el enlace a funciones y permite marcar el aviso como leído. Leerlo no lo elimina ni lo vuelve a generar en cada navegación.

Con la aplicación cerrada no se ejecutan comprobaciones ni llegan avisos. Tampoco hay un temporizador permanente: una pantalla que queda abierta necesita navegación o actualización. El aviso se detecta al volver. Esta modalidad es compatible con la futura PWA, pero no equivale a Web Push.

## Cuándo se considera venta habilitada

Película visible, estreno dentro de la ventana de siete días de preventa o ya estrenada, y al menos una función activa que todavía no comenzó. Se utiliza hora de Buenos Aires y el mismo intervalo jueves → miércoles que la pantalla de funciones; para una preventa posterior a la semana actual se consulta desde el estreno hasta su miércoles final.

Una fecha de estreno sola no genera aviso. Una película oculta, una función inactiva/pasada o funciones fuera del intervalo navegable no habilitan el enlace. Si se retiran las funciones después del aviso, se conserva el aviso histórico y se informa que actualmente no hay funciones habilitadas.

El aviso anuncia apertura de venta, no garantiza ni reserva butacas: la selección y disponibilidad de asientos se comprueban en el flujo existente de compra.

## Archivos y arquitectura

- models/alerta-estreno.ts: interfaces de preferencia y presentación.
- services/alerta.ts: usuario actual, activación/desactivación, consulta de películas y funciones, disponibilidad, aviso persistente y contador.
- pages/cliente/alertas: nueva pantalla con carga, vacío, error, lectura y desactivación.
- pages/cliente/proximamente: integra los controles sin eliminar EnPreventa ni PeliculaCard.
- components/navbar: enlace, contador y comprobación al iniciar; limpiar contador al cerrar sesión.
- app.routes.ts: /alertas con authGuard y lazy loading.
- services/pelicula.ts: errores de Próximamente se propagan para no presentarlos como ausencia de películas.
- sql/bloque-7-alertas.sql, src/tests/alertas.spec.ts y tests/alertas-persistencia.sql: persistencia y pruebas.

Component → AlertaService → Supabase → Component → Template. DI entrega los servicios; signals actualizan lista, carga, error y contador compartido; OnInit consulta cuando se abre la pantalla; @if/@for muestran estados; RouterLink lleva a funciones. Se conservan la directiva estructural EnPreventa y el Input/Output de PeliculaCard. No se agregan dependencias, estilos, RPC, triggers ni servicios externos.

## Datos y permisos

alertas_estrenos guarda usuario_id, pelicula_id, activa, notificada_at, leida y created_at. La clave compuesta evita duplicar el interés. RLS permite SELECT/INSERT/UPDATE propios para cuentas registradas; visitantes no tienen acceso. UPDATE comprueba autor original y final. No hay permisos de borrado para el cliente.

El primer aviso se guarda condicionado por activa=true y notificada_at IS NULL. Se relee el estado persistido para coordinar comprobaciones simultáneas de Navbar y Mis alertas. Las lecturas se paginan y las consultas de películas/funciones se agrupan por IDs, evitando una consulta por tarjeta.

## Defensa

“El aviso es una preferencia guardada en Supabase. Al entrar, el servicio comprueba si la película tiene venta habilitada y funciones activas. Si corresponde, guarda la fecha del primer aviso. El contador muestra los avisos que todavía no marqué como leídos. No depende de mantener la página abierta y no necesita infraestructura externa, pero se recibe dentro de CineBera al volver a entrar.”

## Validación

21 pruebas específicas aprobadas: preventa y su límite, funciones futuras/inactivas/pasadas, película oculta, semana accesible, cuentas anónimas, activación única, lectura, desactivación, errores, primera notificación, aviso leído, desactivación concurrente, guard y template.

SQL real ejecutado con rollback: duplicados, persistencia del aviso y lectura, desactivación, acceso ajeno y acceso anónimo. Las fixtures se revirtieron. REST verifica la existencia de la tabla y denegación de lectura al visitante.

Build correcto con advertencias previas de presupuesto/CommonJS. No se repitió la suite general que conserva errores heredados ni se hizo una sesión manual completa de navegador. Los pendientes de RLS de las tablas anteriores siguen perteneciendo al bloque 13; la nueva tabla sí tiene RLS.

~~~powershell
npm.cmd test -- --watch=false --ts-config tests/tsconfig.alertas.json --include src/tests/alertas.spec.ts
npm.cmd run build
node tests/verificar-alertas-rest.mjs
~~~

Entrega para merge manual; detenerse antes del bloque 8.
