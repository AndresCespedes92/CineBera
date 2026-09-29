# Etapa 4: cuenta, administración y cierre

Angular Material/CDK reemplaza a PrimeNG por decisión del usuario. Se adaptaron las acciones de cuenta, fidelización, alertas, login/registro y administración, así como superficies, textos, formularios y tablas al tema. Las tablas conservan su HTML semántico y datos: su contenedor permite desplazamiento horizontal sin desbordar la página. Los gráficos SVG y exportaciones existentes se conservan. Los campos de fecha nativos mantienen los valores ISO que requieren los servicios.

CanDeactivate usa MatDialog con dos decisiones explícitas: Seguir editando o Descartar cambios. Escape/cierre equivale a conservar. Se mantiene beforeunload nativo para recarga/cierre. El guard acepta boolean u Observable; los formularios limpios no abren diálogo.

## Verificación

Suite UX: navegación, reseñas/ranking, combos/checkout/pago, CanDeactivate y diálogo real. Se corrigió una colisión entre el proveedor Material y el mock en la prueba de router; la inyección usa una única instancia.

Revisión visual en navegador: cartelera a 360 y 1440px; funciones y mapa de butacas en móvil; mapa a 768px. Búsqueda de Interstellar y navegación hasta sus butacas verificadas. No hubo desborde horizontal de página (mapa con scroll propio). Afiches reales cargados con proporción 2:3. Capturas en docs/capturas-ux.

Límites de la revisión: no se inició sesión administrativa ni se realizaron compras, reservas persistidas o pagos reales. Las pantallas autenticadas y los flujos de checkout/pago se verificaron mediante pruebas y compilación; queda conveniente una recorrida visual con la sesión del usuario. No se afirma coincidencia píxel a píxel de todas las pantallas con Figma: se aplicó su sistema visual a las pantallas existentes.

## Ramas, en orden

1. feature/ux-base — base main.
2. feature/ux-cartelera — base feature/ux-base.
3. feature/ux-compra — base feature/ux-cartelera.
4. feature/ux-cuenta-admin — base feature/ux-compra; incluye ajustes encontrados en la revisión final.

Puede revisarse el conjunto comparando main con feature/ux-cuenta-admin. No se realiza merge automáticamente. RLS, políticas y PWA siguen fuera de alcance.

Resultado final: 87 pruebas aprobadas en 5 archivos. Build de producción aprobado: 546,57 kB iniciales (~26,4 kB más que antes del trabajo). Persisten advertencias de presupuesto de 500 kB y CommonJS; no se aumentaron los límites para ocultarlas.
