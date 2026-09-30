# Roles, Personal y Navegación — etapa 1

Estado: primera etapa verificada. El bloque completo sigue pendiente de Personal/alta y validación integral.

## Cambios
- `src/app/directives/roles.ts`: directiva estructural educativa que crea o retira la vista según roles permitidos y rol actual. Conserva la vista si el permiso no cambia.
- `src/app/components/navbar/navbar.{ts,html,css}`: tres usos reales (cliente, admin, operativo), alertas solo para cliente, badge existente, menú sin salto de enlaces en escritorio y desplegable desde 1279 px. Escape cierra y devuelve foco al botón.
- `src/app/guards/role-guard.ts`: al rechazar acceso, dirige al empleado a validación, al admin al panel y al cliente a cartelera mediante `/`.
- `src/tests/roles.spec.ts`, `src/tests/navegacion.spec.ts`, `src/app/guards/role-guard.spec.ts`, `tests/tsconfig.roles.json`: pruebas enfocadas.

## Flujo y defensa
Navbar consulta Auth → sesión → Usuario → perfil. Su signal `rol` alimenta `*appRoles="['admin']; actual: rol()"`. La directiva solo controla la vista; no consulta nuevamente Supabase ni reemplaza al guard. El guard consulta sesión y perfil al evaluar la ruta y decide permitir o redirigir. Ninguno constituye seguridad de base de datos.

Visitante: Cartelera, Próximamente, login y registro. Cliente: además alertas, películas, fidelización, perfil y cierre de sesión. Empleado: enlaces públicos, validación/retiros, perfil y cierre. Admin: lo anterior más Administración, sin enlaces personales de cliente.

`/admin` ya tenía roleGuard para admin; `/empleado/validar-entrada` ya lo tenía para admin/empleado. Se conservaron esas configuraciones. authGuard mantiene el requisito de cuenta para perfil, alertas, historial y fidelización. El registro público no cambió.

Conceptos utilizados: directiva estructural propia, @Input, OnChanges, TemplateRef, ViewContainerRef, signals, @if, ng-container, inyección de dependencias, RouterLink y CanMatch.

## Verificación
- 38 pruebas aprobadas en cuatro archivos: roles, navegación, roleGuard y authGuard.
- Build de producción correcto: inicial 546.69 kB. Avisos históricos por presupuesto de 500 kB y CommonJS de jsPDF/canvg/qrcode, sin cambios de presupuestos.
- Navegador real: visitante a 1440, 1024 y 360 px, sin desbordamiento; menú móvil abre/cierra y Escape devuelve foco. Roles autenticados comprobados con mocks en tests, no con cuentas reales en navegador.
- La copia aislada necesitó `src/environments/environment.local.ts`; se copió localmente y se verificó que Git lo ignora. Los primeros intentos de compilación fallaron por su ausencia y pasaron tras copiarlo.
- No se ejecutó toda la suite histórica ni se modificó Supabase, RLS o PWA.

## Continuación
Implementar Personal, revisar alta de identidad y conservación de sesión administrativa, integrar enlace/tarjeta y verificar flujo real. No considerar terminado el bloque todavía.

## Preservación de trabajo local
Rama creada desde origin/main actualizado en worktree separado. Los cuatro archivos modificados en el checkout original permanecen intactos. Se conservaron en este navbar el badge y los ajustes existentes, corrigiendo el desplegado responsive. No se incorporaron los cambios locales ajenos de registro o pasos de compra.
