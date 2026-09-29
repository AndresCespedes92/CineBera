# CanDeactivate: cambios pendientes en combos

La ruta /admin/combos utiliza cambiosPendientesGuard y el contrato FormularioConCambios. El componente compara sus campos con una copia inicial: abrir una edición o restaurar los valores originales no genera alertas falsas.

- Al navegar con cambios, confirmar descarta y cancelar conserva el formulario.
- Cambiar de combo o cancelar la edición también pide confirmación si hay cambios.
- Durante una escritura se bloquea la salida por router; un guardado exitoso reinicia la referencia y un error conserva el borrador.
- Recargar/cerrar usa beforeunload. El navegador controla el aviso nativo y puede requerir interacción previa; no guarda borradores entre recargas.
- Alcance: formulario de combos. No aplica aún a otros formularios. No modifica Supabase, RLS, políticas ni PWA.

## Verificación

46 pruebas aprobadas (10 nuevas y 36 de regresión de combos), incluida navegación real con RouterTestingHarness rechazando y aceptando la salida.

Comando: npm.cmd test -- --watch=false --ts-config tests/tsconfig.candeactivate.json --include src/tests/candeactivate.spec.ts --include src/tests/combos.spec.ts

Prueba manual sugerida: abrir Administración > Combos, modificar un campo, pulsar Volver al panel y rechazar/aceptar el aviso. Repetir tras guardar o restaurar el valor original.

## Próxima decisión de diseño (sin instalar dependencias)

PrimeNG ofrece componentes y temas basados en tokens: https://primeng.dev/theming/styled . Es la recomendación para acelerar formularios, diálogos y tablas manteniendo la paleta de Figma. Angular Material/CDK es otra alternativa; CDK permite componer interacciones con estilos propios: https://material.angular.dev/cdk/categories . Verificar las versiones compatibles con Angular 22 antes de instalar.

Referencia de cine consultada: https://www.cinemark.com.ar/ muestra cartelera, filtros y metadatos de películas. El acceso web a Cinépolis no pudo verificarse en esta revisión. La adaptación visual y evaluación móvil quedan pendientes del bloque de diseño. Conservar el flujo acordado: checkout > Candy > checkout > Ir al pago, y usar Figma como referencia visual principal.

Compilación de producción aprobada; persisten avisos de presupuesto inicial (520,16 kB frente a 500 kB) y dependencias CommonJS.
