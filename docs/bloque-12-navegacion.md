# Bloque 12 — Navegación y guards por rol

## Alcance

Se completaron menús, enlaces, redirecciones y guards del cliente Angular. Por instrucción expresa del usuario, RLS y políticas quedan fuera de alcance hasta nueva autorización. No se ejecutaron consultas ni cambios de base de datos, migraciones o modificaciones de políticas en este bloque.

## Navegación del cliente

La navbar ofrece Cartelera y Próximamente a visitantes, junto con Iniciar sesión y Crear cuenta. Para cuentas registradas agrega Mis alertas, Mis películas, Fidelización/Recompensas y Mi perfil. Candy se conserva exclusivamente dentro del flujo de checkout: elegir productos, volver al checkout y luego ir al pago. No se agregó Candy como acceso independiente en el menú ni desde la entrada.

/perfil ahora tiene una pantalla de consulta del usuario de la sesión: nombre, apellido, correo y rol. No incluye edición de datos ni administración de usuarios. Muestra carga, errores y reintento; la consulta siempre utiliza el UUID de la sesión y descarta datos previos si falla.

La navbar también aparece en Fidelización, en el layout administrativo y en la pantalla del empleado, permitiendo volver a Cartelera, consultar el perfil y cerrar sesión.

## Administración

Menú y panel comparten navegacionAdmin, con rutas reales a Películas, Funciones, Candy, Cupones, Recompensas, Combos, Reportes, Gráficos y Auditoría. /admin redirige a /admin/home. Se retiraron enlaces a Usuarios y Configuración porque sus pantallas no están implementadas.

El panel concentra accesos y deriva las consultas de ventas a Reportes y Gráficos; se retiraron sus indicadores y destacados simulados. Se conservaron los ajustes de estilos presentes en el workspace para envolver enlaces y mantener separación entre navegación y contenido.

## Empleado y login

El login del empleado ahora redirige a /empleado/validar-entrada. /empleado también redirige allí para conservar el acceso corto. La navbar ofrece Entradas y retiros Candy a admin y empleado, y Administración solamente a admin. La pantalla existente sigue atendiendo ingresos, retiros de pedidos y canjes Candy mediante QR o código manual.

roleGuard se reutiliza con data.roles en las rutas: administración admite admin; validación admite admin y empleado. Un visitante o sesión anónima va a Login. Un usuario registrado sin el rol requerido va a Cartelera. Errores de sesión también producen redirección, sin dejar una navegación sin resolver.

authGuard requiere cuenta registrada en Perfil, Fidelización, Mis películas y Mis alertas. Los flujos públicos de compra, checkout y pago conservan sus rutas. Estos guards controlan navegación del frontend; no representan cambios de permisos de la API.

El cierre de sesión verifica el resultado antes de limpiar nombre, rol y contador de alertas, y vuelve a Cartelera. Si falla, muestra error y permite reintentar. No se muestra un cierre exitoso cuando el servidor devolvió un error. Si falla la lectura de perfil, el menú no habilita accesos de personal.

## Verificación

- 120 pruebas aprobadas: 13 de guards, 15 de navegación y perfil, 71 de fidelización/entradas y 21 de alertas.
- npm.cmd test -- --watch=false --ts-config tsconfig.navegacion.spec.json --include src/app/guards/auth-guard.spec.ts --include src/app/guards/role-guard.spec.ts --include src/tests/navegacion.spec.ts --include src/tests/fidelizacion-beneficios.spec.ts --include src/tests/alertas.spec.ts
- npm.cmd run build: correcto. Continúan advertencias heredadas de CommonJS y presupuesto inicial (519,87 kB frente a 500 kB).
- Cobertura: cuentas cliente/admin/empleado, visitantes, sesiones anónimas, errores de perfil/sesión/logout, destinos del login, enlaces administrativos existentes, consulta del perfil propio, menú sin Candy independiente y protección de rutas.
- git diff --check: sin errores de espacios. No se realizó recorrido manual en navegador.
- Las specs focalizadas reemplazan los antiguos stubs de guards y cubren su firma actual de Angular. El resto de la suite general conserva sus problemas heredados; no se declara validada en conjunto.

## Defensa oral

Los guards funcionales usan inject y devuelven true o un UrlTree. roleGuard lee los roles admitidos desde la configuración de ruta y consulta el perfil existente. La navbar utiliza signals y @if para presentar accesos según la sesión; no crea un sistema nuevo de autorización. El panel y el menú reutilizan una lista de rutas con @for. Perfil es un componente standalone con carga asíncrona y manejo de errores; las pantallas se cargan mediante lazy loading.
