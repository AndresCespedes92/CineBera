# FUNCIONALIDAD TERMINADA
Roles + Personal + Navegación. Validación real completada el 29/09/2026 (hora local).

## Archivos modificados
- `src/app/pages/admin/personal/personal.ts`, `.html`, `.css`: listado, formulario, estados, reintento de perfil y protección de borrador.
- `src/app/forms/registro-form.ts`: FormGroup nuevo por pantalla, con las reglas existentes de Registro.
- `src/app/pages/registro/registro.ts`: consume el formulario compartido; sigue insertando rol cliente.
- `src/app/services/auth.ts`: alta con cliente temporal y liberación de recursos.
- `src/app/services/usuario.ts`: consulta de empleados e inserción con rol empleado fijo.
- `src/app/supabase.ts`: cliente temporal con la misma URL y clave pública.
- `src/app/app.routes.ts`: `/admin/personal`, lazy loading y CanDeactivate.
- `src/app/models/navegacion-admin.ts`: Personal en menú y tarjeta; Combos junto a Gestión.
- `src/tests/personal.spec.ts`, `src/tests/personal-auth.spec.ts`, `tests/tsconfig.personal.json`: pruebas específicas.

## Qué se implementó
Personal integrado a la administración existente. Listado con carga, vacío, error y actualización. Alta mediante Reactive Forms, bloqueo de doble envío, mensajes y protección ante salida. No se agregaron bibliotecas ni se cambiaron tablas, RLS, policies o PWA.

## Gestión de empleados
El listado consulta nombre, apellido, rol y días de vacaciones. Se comprobó el esquema real: perfiles no contiene email; este queda en Auth y no se consulta mediante APIs administrativas. Fecha de nacimiento, grupo sanguíneo y color de ojos son campos reales utilizados en el formulario, no se muestran innecesariamente en la lista.

+ Nuevo empleado abre el formulario. El rol se fija también en Usuario.crearPerfilEmpleado. No existe selector de rol ni actualización/promoción de cuentas existentes. Se reutilizan los validadores de contraseña y fecha, PageHeader, estilos de Registro, Material y el guard/diálogo de salida.

## Supabase Auth
Se verificaron las opciones en la documentación y el código de la biblioteca instalada. signUp puede guardar una sesión y emitir SIGNED_IN. Por eso Auth.registrarEmpleado usa otra instancia del mismo SDK con persistSession:false, autoRefreshToken:false, detectSessionInUrl:false y storageKey único. En esta configuración el SDK almacena en memoria y no abre BroadcastChannel. Al finalizar, auth.dispose libera recursos sin invocar signOut en la sesión administrativa.

Fuentes: [Inicialización del cliente](https://supabase.com/docs/reference/javascript/initializing), [signUp](https://supabase.com/docs/reference/javascript/auth-signup).

No usa service_role ni una API administrativa. Sigue sujeto a la configuración pública de registro: confirmación de email, registro habilitado, límites de envío y eventuales requisitos adicionales del proyecto. Si Auth no devuelve una identidad verificable, no se inserta perfil. Si requiere confirmación, la UI lo informa; no se omite esa verificación.

Auth y perfiles NO son una transacción. Si se crea la identidad pero falla el perfil, se conserva en memoria su ID y datos para reintentar únicamente el INSERT; las contraseñas se limpian. Si una respuesta se perdió, un perfil existente solo se acepta como éxito cuando todos sus campos coinciden; nunca se sobrescribe. Si se cierra/recarga la página o la respuesta del propio signUp se pierde, puede hacer falta revisar manualmente la identidad desde Supabase y completar/corregir el alta. No se implementó rollback de identidades, que requeriría capacidades administrativas fuera de alcance.

## Directiva por rol
Implementada y mergeada en etapa 1: `appRoles`. Consume el rol que el navbar obtiene de Auth/Usuario. Tres usos: cliente, admin y admin/empleado. Ejemplo: `*appRoles="['admin']; actual: rol()"`. Controla visibilidad, no seguridad de base de datos.

## Guards
`roleGuard` del padre `/admin` admite solo admin y protege Personal. `/empleado/validar-entrada` admite admin y empleado. `authGuard` protege perfil e interfaces personales que requieren cuenta. Personal vuelve a comprobar sesión/rol antes de listar o guardar; esto no sustituye controles de base de datos. CanDeactivate y beforeunload advierten al salir con borrador/alta parcial y bloquean navegación Angular durante el guardado.

## Navbar
Sin cambios respecto de la etapa 1: visitante ve enlaces públicos/login/registro; cliente suma alertas, películas y fidelización; empleado tiene herramientas operativas; admin suma Administración. Los autenticados conservan perfil y cierre de sesión.

## Flujo entre partes
Navbar → appRoles → rol consultado con Auth/Usuario → visibilidad.
Ruta → roleGuard → sesión y perfil → permitir/redirigir.
Personal → Auth.registrarEmpleado → cliente temporal → nueva identidad.
Personal → Usuario.crearPerfilEmpleado → cliente principal del administrador → perfiles.
Personal → Usuario.listarEmpleados → perfiles con rol empleado.

## Conceptos Angular utilizados
Signals, Reactive Forms, FormGroup/FormControl, Validators y validadores propios, @if/@for, proyección ng-content mediante PageHeader, inyección de dependencias, lazy loading, CanMatch, CanDeactivate, HostListener y Observable del diálogo existente. El registro conserva NgClass y su template. No se eliminaron los restantes conceptos académicos del proyecto.

## Cómo explicarlo en defensa
Auth crea la identidad y perfiles guarda los datos del empleado. El alta usa un cliente temporal para que la cuenta nueva no reemplace la sesión del administrador. Los servicios concentran las consultas. La directiva decide qué enlaces mostrar y el guard decide a qué rutas se puede navegar. Si falla el perfil después de crear la identidad, reintentamos esa segunda operación sin volver a registrar la cuenta.

## Pruebas realizadas
63 casos verificados entre Personal, SDK/Auth, navegación, directiva y roleGuard. El primer recorrido tuvo 3 fallos por una firma JWT sintética mal formada en la preparación del test: se corrigió la fixture, se agregó comprobación de la sesión inicial y pasaron los 6 tests del SDK en la repetición; los otros 57 ya habían pasado.

Incluye: roles rechazados, sesión anónima, validaciones, cliente público, carga/error/reintento, alta con/sin confirmación, rechazo de duplicados, perfil pendiente, respuesta de INSERT perdida, doble envío, cancelación y renderizado del componente. El SDK real se ejecutó con transporte simulado: se compararon sesión y localStorage antes/después. No se crearon cuentas reales ni se enviaron correos de prueba.

Se consultó el esquema real de perfiles y se verificó una consulta de empleados de solo lectura. Esto no equivale a probar permisos del cliente ni completar un alta real. No se ejecutó la suite general histórica.

## Validación integral posterior (navegador real)
- El usuario inició sesión como administrador y completó personalmente el alta, incluidas las credenciales.
- Personal mostró el listado vacío antes del alta y luego el mensaje de éxito con la fila de rol empleado.
- Tras crear la cuenta se pudo volver a /admin/home y el menú mantuvo la identidad Admin: la sesión administrativa no fue reemplazada.
- Se revisó Personal en tamaños de escritorio, intermedio y móvil, sin desbordamiento horizontal de página ni campos. Los anchos CSS observados fueron 1309, 931 y 327 px debido al escalado del navegador.
- Después de cerrar la sesión administrativa, el usuario ingresó con la cuenta nueva y llegó a /empleado/validar-entrada.
- El menú mostró Cartelera, Próximamente, Entradas y retiros Candy, Mi perfil y cierre de sesión; no mostró Administración ni enlaces exclusivos del cliente.
- Abrir directamente /admin/personal y /admin/home con el empleado redirigió en ambos casos a /empleado/validar-entrada.
- No se escanearon entradas ni se efectuaron retiros de Candy: se verificó el acceso operativo, sin consumir compras.
- No se registraron credenciales en documentación ni se modificaron datos de la cuenta fuera del formulario que completó el usuario.
- Esta actualización solo documenta la prueba real; no se modificó código ni se repitió el build ya aprobado.

## Build
Build de producción correcto. Inicial: 547.56 kB. Avisos conocidos: presupuesto inicial 500 kB y CommonJS de dependencias jsPDF/canvg/qrcode. No se ampliaron presupuestos.

## Pendientes / riesgos
- La configuración actual permitió el alta y login real sin confirmación adicional. El caso con confirmación de correo fue cubierto con el SDK real y transporte simulado, no con un email real.
- Los escenarios de cliente y errores del alta se cubrieron con tests automatizados. No se reprodujeron fallos deliberados en la base real.
- Un alta parcial puede requerir intervención manual si se abandona la pantalla; limitación explícita de las dos operaciones independientes.
- La protección autoritativa del rol en la base sigue fuera del bloque, tal como se solicitó. No se modificó RLS.

La rama parte de origin/main c351764, que contiene el merge de la etapa 1. Se reutiliza el worktree aislado; los cuatro cambios locales del checkout original permanecen intactos.
