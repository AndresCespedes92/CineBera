# Bloque 3 — Combos

Implementado sobre main `ad7934b`, en `feature/combos`. Migración `combos_configurables` aplicada en Supabase el 29/09/2026; su fuente es `sql/bloque-3-combos.sql`. No volver a ejecutarla sobre la misma base.

## Uso y reglas

- El administrador entra a `/admin/combos` para crear, editar precio/productos y activar o desactivar. Debe seleccionar un producto activo de Pochoclos y otro de Bebidas. No se cargaron precios ficticios: el administrador configura el primer combo.
- En checkout se elige un tipo de combo y su cantidad, hasta la cantidad de entradas reservadas. Cada unidad incluye una entrada, un pochoclo y una bebida.
- El precio fijo incluye VIP. Los combos cubren primero las entradas más caras; las promociones se aplican solamente a las entradas restantes. El canje de entrada gratis no se combina con combos en la misma compra.
- El cliente puede ir desde checkout a Candy, elegir extras y volver: el combo se conserva por token de reserva en sessionStorage. Luego pulsa Ir al pago. La entrada emitida no ofrece comprar Candy.
- Antes de preparar la compra se vuelve a consultar disponibilidad y configuración. Si cambiaron, se solicita actualizar la selección. Una compra ya preparada conserva su precio histórico.
- Los productos incluidos se retiran con el mismo QR de la entrada y el mismo pedido Candy. No se crean QR adicionales.

## Implementación para defender en el TP

Se mantiene Component → Service → Supabase, sin dependencias nuevas, RPC ni triggers. `ComboService` centraliza catálogo, selección y cálculo. Los componentes usan signals para estado y computed para importes; el formulario administrativo usa FormsModule.

La tabla `combos` representa el catálogo editable. Las columnas `combo_*` de `compras` guardan una copia del nombre, precio, cantidad y productos elegidos: modificar el catálogo no cambia una compra anterior. Desactivar reemplaza la eliminación física.

`compras.total` contiene combos completos más entradas restantes. `pedidos_candy.total` contiene únicamente extras. `detalles_pedido_candy.cantidad_combo` distingue unidades incluidas; si hay extras del mismo producto se suman en una sola fila y el subtotal cobra solamente los extras. Así, pago y acreditación de puntos reutilizan los servicios existentes sin cobrar ni acreditar dos veces el importe del combo.

El pago comprueba que los productos incluidos estén preparados y que haya suficientes butacas. El flujo conserva los controles previos de sesión, vencimiento, estado pendiente y entrega única. Los campos nuevos son compatibles con compras anteriores: cantidad cero y datos de combo nulos.

## Verificación realizada

- Build de producción correcto. Advertencias de dependencias CommonJS y bundle inicial de 514,30 kB frente al presupuesto de 500 kB.
- 36 pruebas de combos: importes, VIP, promociones, cantidad, catálogo, persistencia, productos incluidos, pago y componentes.
- 71 pruebas de fidelización/checkout y 31 de asignación de salas: todas pasan (138 en total).
- `tests/combos-persistencia.sql` ejecutado en Supabase con rollback: permisos por rol, copia histórica, importes y restricciones. Los datos de prueba no permanecen en la base.
- `tests/verificar-combos-rest.mjs`: consultas públicas y nuevas columnas verificadas por REST.
- La suite general sigue detenida por los mismos 13 errores de compilación heredados en specs de directivas, guard y servicios. No se presenta como aprobada.
- No se realizó una compra manual completa en navegador ni una lectura física con cámara durante este bloque.

Comandos reproducibles:

```powershell
npm.cmd run build
npm.cmd test -- --watch=false --ts-config tests/tsconfig.combos.json --include src/tests/combos.spec.ts
npm.cmd test -- --watch=false --ts-config tests/tsconfig.fidelizacion.json --include src/tests/fidelizacion-beneficios.spec.ts
npm.cmd test -- --watch=false --ts-config tests/tsconfig.asignacion.json --include src/tests/asignacion-salas.spec.ts
node tests/verificar-combos-rest.mjs
```

## Límites y pendientes previos

Se permite un tipo de combo por compra, sin control de stock. Las operaciones de compra, Candy y butacas son llamadas separadas; no constituyen una transacción atómica entre múltiples pestañas.

La nueva tabla tiene RLS para lectura pública de activos y escritura administrativa. Esto no resuelve la seguridad global: el advisor mantiene 14 tablas anteriores sin RLS, incluida `perfiles`, de la cual depende la identificación de administradores. Esa integridad y la validación autoritativa de importes quedan para el bloque de seguridad. [Referencia de RLS](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).

También persisten los avisos previos sobre `test_authorization_header` con [search_path mutable](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) y [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

La rama se entrega para merge manual. El bloque siguiente requiere autorización posterior.
