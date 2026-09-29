# Etapa 1: base visual y navegación

Tema oscuro de Figma: fondo #1e1a14, superficies #2a2520/#332d27, texto crema y acento dorado. Fuentes locales Geist y Playfair Display. Menú móvil desplegable con estado accesible; enlaces conservados por rol.

Se sustituyó la propuesta de PrimeNG por Angular Material/CDK 22.1.0 a pedido del usuario al comprobar que PrimeNG 22 exige una clave. No quedan dependencias PrimeNG. El tema se centraliza en src/material-theme.scss y las variables de aplicación en src/styles.css.

Figma: https://www.figma.com/design/npOTQoiVnjea5iPowB9rQs/?node-id=27-42
Referencia de contenido: https://www.cinemark.com.ar/ (cartelera, filtros y metadatos). Se conservan la marca CineBera y los datos reales.

Las próximas etapas se construyen como ramas dependientes: ux-cartelera sobre ux-base, ux-compra sobre ux-cartelera y ux-cuenta-admin sobre ux-compra. Integrar en ese orden; el agente no realiza merges.

Fuera de alcance: RLS, políticas y PWA. No se modifican reglas de negocio ni servicios de datos.
