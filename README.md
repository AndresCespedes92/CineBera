# CineBera

## Documentación y entrega

### Requerimientos
CineBera implementa los requerimientos funcionales definidos para el trabajo práctico, incluyendo gestión de películas, funciones y salas, selección de butacas, compra de entradas, Candy, promociones, fidelización, preventa, roles de usuario, reportes y administración.

El detalle completo de requerimientos, historias de usuario, flujos y diagramas se encuentra documentado en el tablero de Miro del proyecto.

### Aplicación de conceptos vistos en clase
El proyecto fue desarrollado con Angular y aplica los principales conceptos trabajados durante la cursada: componentes standalone, routing y rutas hijas, lazy loading, servicios e inyección de dependencias, Reactive Forms y validadores personalizados, data binding, Signals, directivas propias, Pipes, Guards (CanActivate, CanMatch y CanDeactivate), @Input/@Output, control de flujo, consumo de APIs y comunicación con Supabase.

Supabase se utiliza para autenticación, persistencia de datos, Storage y funcionalidades en tiempo real.

### Decisiones de diseño y arquitectura
Se utilizó una arquitectura basada principalmente en:

**Componentes → Servicios → Supabase**

Los componentes administran la interfaz y la interacción con el usuario, mientras que los servicios concentran la lógica de acceso a datos y comunicación con Supabase. La aplicación utiliza roles (cliente, empleado y administrador) para adaptar la navegación y las funcionalidades disponibles.

Las decisiones funcionales, diagramas y flujos completos están documentados en Miro.

### Despliegue
La aplicación se encuentra desplegada y disponible públicamente.

- **Aplicación:** https://cinebera.web.app
- **Documentación funcional y diagramas:** [https://miro.com/app/board/uXjVHogrWv8=/](https://miro.com/app/board/uXjVHogrWv8=/?share_link_id=2295409427)
- **Diseño y paleta de colores:** https://www.figma.com/design/npOTQoiVnjea5iPowB9rQs/Cine-TP-%E2%80%93-Prototipo-Programaci%C3%B3n-IV?node-id=0-1&p=f&t=oIhDM4NTu3IVSmJO-0

Comandos para deploy en firebase:
ng build
Remove-Item .\public\* -Recurse -Force
Copy-Item .\dist\cine-bera\browser\* .\public\ -Recurse -Force
firebase deploy --only hosting