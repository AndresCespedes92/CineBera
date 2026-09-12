# Proyecto Cine: historias de usuario y plan de sprints

Fuente: TP 1 - Programacion IV - 2026 C2.pdf (10 páginas). Se analizaron los 10 correos en su orden original y la consigna general.

Entrega académica: **5 de octubre de 2026**. Plan relativo: **6 sprints de 4 días**. Cada sprint termina con una demostración y una versión desplegada. 40 historias comprometidas + 5 tarjetas técnicas; 1 historia sin aprobación fuera del plan.

## Calendario relativo

| Sprint | Días | Entrega | Objetivo |
|---|---|---|---|
| S1 | 1-4 | Día 4 | Base desplegada, roles y cartelera |
| S2 | 5-8 | Día 8 | Salas, programación y primera compra |
| S3 | 9-12 | Día 12 | Operación completa: QR, candy, cupones y opiniones |
| S4 | 13-16 | Día 16 | Fidelización, combos, estrenos y preventa |
| S5 | 17-20 | Día 20 | Cancelación, crédito, reportes finales y auditoría |
| S6 | 21-24 | Día 24 | PWA, cierre integral y preparación de entrega |

Si el día 1 es 09/09, el día 24 es 02/10 y quedan 03-05/10 para contingencia/entrega. Es una referencia de viabilidad, no una fecha inicial acordada.

## Condiciones del plan

- Las fechas de 2020 son la cronología ficticia de los correos, no fechas del sprint.
- Plan solicitado en días relativos; entrega académica el 5 de octubre de 2026. Seis sprints de cuatro días = 24 días de trabajo calendario.
- Plan exigente y provisional: faltan dedicación e integrantes para validar capacidad. No se garantiza alcance solo por asignar tarjetas a una fecha.
- S3 y S4 tienen mucha carga. Revisar capacidad al final de cada sprint; si no alcanza, acordar simplificaciones con la cátedra, sin omitir requisitos en silencio.
- Orden del backlog por correo; ejecución por dependencias y versión final de los requisitos.
- HU41 no está aprobada y no integra ningún sprint.
- No se programa ninguna automatización ni se construye la aplicación en esta tarea.

## Evolución de requisitos

| Correo | Fecha | Páginas PDF | Cambio |
|---|---|---|---|
| C01 | 01/01/2020 | 1-3 | Venta de entradas, cartelera, salas, registro y cupón inicial |
| C02 | 16/01/2020 | 3-4 | Reseñas, promedio, top 3 y buscador |
| C03 | 16/01/2020 | 4 | Ampliación del buscador a múltiples géneros |
| C04 | 30/01/2020 | 4-5 | Cupones configurables, mayores de 50, candy y mapa sin aprobación |
| C05 | 06/02/2020 | 5-6 | Administración, empleados, validación y asignación automática de salas |
| C06 | 12/02/2020 | 6-7 | Restricción de edad, accesibilidad y butacas en tiempo real |
| C07 | 28/02/2020 | 7-8 | Usabilidad, ingreso de fechas/horas y reporte diario |
| C08 | 03/03/2020 | 8-9 | Puntos, recompensas, historial de canjes y combos |
| C09 | 08/03/2020 | 9 | Próximamente, alertas, preventa y Mis películas |
| C10 | 10/03/2020 | 10 | Cancelación, crédito, VIP, exportaciones, gráficos y auditoría |

El 20% inicial evoluciona a porcentaje configurable. La distribución A-T original se adapta con fila accesible y VIP. El mismo QR exige definir consumos de cine/candy. El mapa del edificio permanece no aprobado; el mapa de butacas sí es obligatorio.

## Tarjetas por orden de correo

### C01 · 01/01/2020 · Venta de entradas, cartelera, salas, registro y cupón inicial

#### HU01 · Registrarme y completar mi perfil

**Como** visitante, **quiero** registrarme e ingresar los datos solicitados, **para** tener una cuenta y acceder a beneficios.

Sprint: S1 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Se registran email, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos y días de vacaciones anuales, según la consigna.
2. Se validan formato de email, fecha de nacimiento y días de vacaciones; se informa cada error junto al campo.
3. Puedo iniciar y cerrar sesión y consultar mis datos; no puedo consultar perfiles ajenos.

Dependencias: TEC02.

Preguntas asociadas: D01.

#### HU02 · Administrar películas y su visibilidad

**Como** administrador, **quiero** gestionar películas y decidir cuáles se publican, **para** controlar la cartelera.

Sprint: S1 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Cada película contiene nombre, duración, imagen y sinopsis; el modelo incorpora múltiples géneros y clasificación de edad solicitados después.
2. Puedo crear y editar películas y activar o desactivar su visibilidad.
3. Una película no publicada no se ofrece para nuevas compras; los comprobantes existentes conservan sus datos.

Dependencias: HU17.

Evolucion: C03 agrega géneros; C06 agrega edades; C09 agrega estreno y preventa.

#### HU03 · Consultar cartelera y detalle

**Como** cliente, **quiero** ver películas, sinopsis y funciones disponibles, **para** elegir qué ver y cuándo.

Sprint: S1 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. La cartelera muestra imagen y nombre de películas publicadas.
2. El detalle muestra duración, sinopsis, clasificación y funciones con fecha, hora, formato 2D/3D/4D/5D e idioma castellano/subtitulada.
3. Los estados sin películas o sin funciones tienen un mensaje claro y no permiten compras inexistentes.

Dependencias: HU02.

Nota: En S1 las funciones se demuestran con datos de prueba; la programación real se integra en S2.

#### HU04 · Administrar salas y distribución de butacas

**Como** administrador, **quiero** gestionar las salas del único edificio y sus butacas, **para** mantener la capacidad real del cine.

Sprint: S2 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Se modela un único edificio con varias salas y bloques laterales/central/lateral.
2. La configuración inicial de referencia tiene filas A-T y bloques de 4/20/4 butacas; la configuración vigente incorpora HU22 y HU36.
3. Modificar la distribución no altera silenciosamente butacas ya vendidas; se identifica qué funciones usan cada distribución.

Dependencias: HU17.

Evolucion: C05 explicita la administración de distribución; C06 reemplaza J/K; C10 convierte R/S/T en VIP.

#### HU05 · Seleccionar función y butacas

**Como** cliente, **quiero** seleccionar una función y butacas disponibles, **para** comprar lugares concretos.

Sprint: S2 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Veo orientación de pantalla, filas, bloques y leyenda de estados.
2. Puedo seleccionar y quitar butacas disponibles y veo cantidad y subtotal.
3. No puedo seleccionar una butaca vendida; accesibles y VIP se distinguen visualmente y por texto.

Dependencias: HU20, HU22, HU36.

#### HU06 · Comprar como invitado o usuario registrado

**Como** cliente, **quiero** pagar entradas con o sin cuenta, **para** completar mi compra sin registro obligatorio.

Sprint: S2 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Existe un recorrido de compra sin cuenta y otro con sesión iniciada.
2. Se muestra un resumen con función, butacas, conceptos y total antes de confirmar.
3. Solo una compra confirmada adjudica definitivamente las butacas; un pago rechazado no genera entradas válidas ni duplicados al reintentar.

Dependencias: HU05, HU21, HU23.

Preguntas asociadas: D02, D03.

#### HU07 · Descargar entrada PDF con QR y código

**Como** comprador, **quiero** obtener un comprobante PDF con QR, **para** presentarlo al ingresar y retirar mi candy.

Sprint: S3 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Tras una compra confirmada se genera un PDF con película, fecha, hora, sala, butacas y datos de compra.
2. Incluye QR y código legible para carga manual; no se emite un comprobante válido por una compra rechazada.
3. El comprobante incluye los productos comprados y, cuando corresponda, la advertencia de adulto exigida por la consigna.

Dependencias: HU06.

Evolucion: C04 incorpora candy al mismo QR; C05 agrega código manual y control de consumo.

Preguntas asociadas: D04.

#### HU08 · Usar el beneficio de primera compra

**Como** usuario registrado, **quiero** aplicar mi cupón de bienvenida a la primera compra, **para** obtener el descuento vigente.

Sprint: S3 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Un usuario elegible dispone del beneficio de primera compra.
2. El descuento mostrado y aplicado usa el porcentaje configurado por el administrador; 20% es el valor original del primer correo, no una constante obligatoria.
3. Una confirmación consume el beneficio una sola vez; un intento fallido no lo consume.

Dependencias: HU01, HU06, HU13.

Evolucion: C04 sustituye el porcentaje fijo del C01.

Preguntas asociadas: D05.

### C02 · 16/01/2020 · Reseñas, promedio, top 3 y buscador

#### HU09 · Publicar mi reseña de una película

**Como** persona que califica una película, **quiero** dar estrellas y escribir un comentario corto, **para** compartir mi opinión.

Sprint: S3 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. Puedo enviar una puntuación en estrellas y un comentario asociado a una película.
2. Se validan el rango de estrellas y el largo de comentario según límites a acordar.
3. La reseña publicada es visible en el detalle antes de comprar entradas.

Dependencias: HU02.

Preguntas asociadas: D06.

#### HU10 · Consultar reseñas y puntuación promedio

**Como** cliente, **quiero** ver opiniones y promedio de estrellas antes de comprar, **para** decidir con más información.

Sprint: S3 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. El detalle permite leer comentarios y puntuaciones antes del checkout.
2. El promedio se calcula sobre las reseñas válidas y se actualiza cuando cambian.
3. Una película sin reseñas muestra ese estado y no un promedio engañoso.

Dependencias: HU09.

#### HU11 · Ver primero las tres películas más vendidas

**Como** cliente, **quiero** ver destacadas las tres películas con más ventas, **para** conocer las más elegidas.

Sprint: S3 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. La página principal antepone hasta tres películas según entradas vendidas.
2. El ranking usa compras confirmadas y tiene un desempate estable.
3. Si hay menos de tres películas elegibles se muestran las existentes sin duplicados.

Dependencias: HU03, HU06.

Preguntas asociadas: D07.

### C03 · 16/01/2020 · Ampliación del buscador a múltiples géneros

#### HU12 · Buscar películas y filtrar por género

**Como** cliente, **quiero** buscar películas y filtrarlas por género, **para** encontrar opciones de mi interés.

Sprint: S1 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. El listado incluye un buscador por nombre y filtro de género.
2. Una película puede pertenecer a varios géneros y aparece al filtrar cualquiera de ellos.
3. Puedo limpiar filtros y recibo un mensaje si no hay resultados.

Dependencias: HU02, HU03.

Evolucion: C02 solicita buscador; C03 añade filtro por género y relación múltiple.

### C04 · 30/01/2020 · Cupones configurables, mayores de 50, candy y mapa sin aprobación

#### HU13 · Configurar el porcentaje del cupón de bienvenida

**Como** administrador, **quiero** cambiar el porcentaje del cupón de primera compra, **para** ajustar la promoción.

Sprint: S3 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. El panel permite guardar un porcentaje válido de descuento.
2. La compra muestra el descuento calculado con la política vigente acordada.
3. Cambiar la configuración no modifica importes de compras ya confirmadas.

Dependencias: HU17.

Preguntas asociadas: D05.

#### HU14 · Crear y aplicar cupones para mayores de 50

**Como** administrador y cliente elegible, **quiero** ofrecer y usar cupones restringidos por edad, **para** dar beneficios a mayores de 50 años.

Sprint: S3 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. El administrador puede crear el cupón y su porcentaje.
2. Solo un usuario que cumpla la condición de más de 50 años puede aplicarlo; se evalúa también el caso límite de 50.
3. El checkout informa descuento aplicado o motivo de no elegibilidad y valida la regla en servidor.

Dependencias: HU01, HU06, HU13.

Preguntas asociadas: D05.

#### HU15 · Administrar productos y categorías de candy

**Como** administrador, **quiero** crear productos de candy y agruparlos en categorías, **para** mantener la oferta de pochoclos, bebidas y otros productos.

Sprint: S3 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Puedo crear y editar categorías y productos con nombre y precio.
2. Cada producto se asocia a una categoría y puedo controlar si está disponible para comprar.
3. Los cambios de precio conservan el importe histórico de las ventas confirmadas.

Dependencias: HU17.

#### HU16 · Comprar candy junto con las entradas

**Como** comprador, **quiero** agregar productos de candy a mi compra, **para** pagarlos juntos y retirarlos con el mismo QR.

Sprint: S3 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Puedo elegir productos y cantidades durante la compra de entradas.
2. El resumen detalla entradas, productos y total, y preserva sus precios al confirmar.
3. El comprobante y el QR de HU07 identifican tanto el ingreso como los productos pendientes de entrega.

Dependencias: HU06, HU07, HU15.

Preguntas asociadas: D04.

#### HU41 · Ver la ubicación de mi sala en un mapa del cine

**Como** comprador, **quiero** ver un mapa del edificio que señale mi sala, **para** orientarme al llegar.

Sprint: Fuera de plan, sin aprobación | Prioridad: Pendiente de aprobación | Estado: pendiente

**Criterios de aceptación**

1. Solo se desarrolla si el cliente aprueba explícitamente esta funcionalidad.
2. Si se aprueba, el mapa del edificio señala la sala de la entrada comprada y utiliza un plano validado.

Dependencias: HU07.

Nota: No confundir con el mapa de selección de butacas, que sí está requerido.

Estado: No comprometida: el correo dice que no tiene luz verde

### C05 · 06/02/2020 · Administración, empleados, validación y asignación automática de salas

#### HU17 · Acceder con roles de administrador y empleado

**Como** responsable del cine, **quiero** contar con accesos diferenciados para administración y empleados, **para** controlar quién administra y quién valida compras.

Sprint: S1 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. El administrador accede a la gestión de películas, salas, funciones, butacas y productos.
2. Los empleados autorizados acceden a la validación de entradas y candy.
3. Cliente e invitado no pueden ejecutar acciones de administración ni validación, aunque invoquen directamente la API.

Dependencias: TEC02.

Nota: S1 entrega control de acceso y pantallas base; cada módulo administrativo se habilita en su sprint.

#### HU18 · Validar ingresos con QR o código manual

**Como** empleado de acceso, **quiero** escanear el QR o ingresar el código manualmente, **para** validar el ingreso incluso si falla el lector.

Sprint: S3 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Ambos métodos consultan la misma compra y muestran datos de la función y entradas.
2. Un ingreso válido se registra una sola vez; otro intento informa que ya fue utilizado.
3. Códigos inexistentes, compras canceladas o entradas inválidas se rechazan con un mensaje claro.

Dependencias: HU07, HU17.

Preguntas asociadas: D04.

#### HU19 · Validar la entrega de candy sin duplicados

**Como** empleado de candy, **quiero** validar el retiro con QR o código manual, **para** entregar los productos correctos una sola vez.

Sprint: S3 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. La validación muestra productos y cantidades de la compra.
2. La entrega confirmada queda consumida y no puede duplicarse, incluso con solicitudes simultáneas.
3. La compra combinada puede completar ingreso y retiro en cualquier orden bajo la regla acordada en D04.

Dependencias: HU16, HU17.

Preguntas asociadas: D04.

#### HU20 · Programar funciones con sala automática y margen de limpieza

**Como** administrador, **quiero** elegir película, días y horarios y que el sistema asigne sala, **para** programar funciones sin superposición.

Sprint: S2 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Puedo programar una película por días de semana y hora, indicando formato e idioma.
2. La asignación automática exige que la función anterior termine al menos 30 minutos antes y no invada la siguiente función.
3. Si no existe una sala válida se informa el conflicto y no se guarda una programación superpuesta; se verifica también ante dos altas simultáneas.

Dependencias: HU02, HU04.

Evolucion: C01 fija duración y margen de 30 minutos; C05 exige asignación automática y recurrencia.

Preguntas asociadas: D08.

### C06 · 12/02/2020 · Restricción de edad, accesibilidad y butacas en tiempo real

#### HU21 · Respetar la clasificación por edad al comprar

**Como** responsable del cine, **quiero** bloquear compras que incumplan la edad de la película, **para** aplicar las restricciones solicitadas.

Sprint: S2 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Cada película admite sin restricción, 13 o 18 años.
2. Se rechaza la compra cuando la edad informada/verificada es inferior al umbral, tanto en interfaz como en servidor.
3. Toda entrada de película restringida incluye la leyenda de acompañamiento adulto solicitada, aun cuando el comprador cumpla el umbral.

Dependencias: HU01, HU02.

Preguntas asociadas: D03.

#### HU22 · Identificar la nueva fila de butacas accesibles

**Como** cliente, **quiero** reconocer las butacas accesibles en el mapa, **para** seleccionar el lugar adecuado.

Sprint: S2 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Se reemplazan las dos filas originales J y K por una fila accesible con bloques 2/10/2, sujeto a confirmación del etiquetado.
2. Las butacas accesibles se distinguen mediante estilo visual y etiqueta, sin depender solo del color.
3. Se elimina la posibilidad de vender las antiguas J/K como si la adaptación no existiera.

Dependencias: HU04.

Evolucion: Sustituye parte de la distribución original C01; el correo usa después la expresión 'filas J y K adaptadas', a aclarar.

Preguntas asociadas: D09.

#### HU23 · Ver disponibilidad de butacas en tiempo real

**Como** cliente que selecciona butacas, **quiero** ver las ventas que ocurren en ese momento, **para** no comprar un lugar ya ocupado.

Sprint: S2 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Una compra confirmada en otra sesión actualiza el mapa sin recargar la página.
2. Si una butaca seleccionada deja de estar disponible, se informa y se impide confirmar con ella.
3. Ante dos compras simultáneas de la misma butaca, solo una puede confirmarse; al reconectar se recupera el estado real.

Dependencias: HU05, TEC02.

Nota: Bloqueo temporal de una selección no fue solicitado: se evalúa como decisión técnica, no como requisito confirmado.

### C07 · 28/02/2020 · Usabilidad, ingreso de fechas/horas y reporte diario

#### HU24 · Navegar e ingresar fechas y horas con facilidad

**Como** cliente o empleado, **quiero** interfaces comprensibles y carga ágil de fechas y horas, **para** completar tareas sin búsquedas ni scroll excesivo.

Sprint: S1 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Los recorridos principales tienen acciones y mensajes claros y funcionan con teclado.
2. La fecha permite ingresar directamente día, mes y año; no exige recorrer meses para ingresar un nacimiento antiguo.
3. La hora se ingresa o selecciona de forma directa; errores y formatos se explican junto a los campos.

Dependencias: ninguna.

Nota: S1 entrega criterios y prototipo; se verifica en cada pantalla de los sprints posteriores.

#### HU25 · Consultar facturación y entradas por día

**Como** administrador, **quiero** ver cuánto se facturó y cuántas entradas se vendieron cada día, **para** controlar el negocio.

Sprint: S3 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. El reporte muestra fecha, facturación y cantidad de entradas, incluyendo días sin movimientos dentro del rango consultado.
2. Los totales provienen de compras confirmadas, sin duplicar reintentos de pago.
3. Se documentan moneda, zona horaria y tratamiento de descuentos, canjes y cancelaciones.

Dependencias: HU06, HU16.

Nota: S3 entrega reporte base; S5/S5 incorporan conciliación de créditos y cancelaciones.

Preguntas asociadas: D10.

### C08 · 03/03/2020 · Puntos, recompensas, historial de canjes y combos

#### HU26 · Acumular un punto por peso gastado

**Como** usuario registrado, **quiero** ganar puntos con mis compras, **para** obtener recompensas.

Sprint: S4 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. Una compra confirmada del usuario acredita 1 punto por peso gastado según la base monetaria acordada.
2. Invitados no acumulan puntos y reintentar una confirmación no acredita puntos duplicados.
3. El movimiento queda asociado al usuario y compra que lo originó.

Dependencias: HU01, HU06.

Preguntas asociadas: D11.

#### HU27 · Configurar recompensas y su costo en puntos

**Como** administrador, **quiero** definir el costo en puntos de entradas y productos de candy, **para** gestionar el programa de fidelización.

Sprint: S4 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. Puedo publicar recompensas de entradas y productos con un costo positivo en puntos.
2. Los valores 500 para una entrada y 150 para pochoclo son ejemplos configurables.
3. Los cambios de costo no alteran canjes ya realizados.

Dependencias: HU15, HU17.

#### HU28 · Canjear puntos por entradas o candy

**Como** usuario registrado, **quiero** canjear mis puntos por recompensas, **para** obtener entradas o productos sin pagarlos en dinero.

Sprint: S4 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. Se comprueba el saldo y el costo vigente antes de confirmar el canje.
2. El canje descuenta puntos y genera la entrada/producto canjeado una sola vez, sin saldos negativos ante concurrencia.
3. La recompensa se integra al mecanismo de validación de entradas o candy y los puntos no se transfieren a otra cuenta.

Dependencias: HU26, HU27, HU18, HU19.

Preguntas asociadas: D11.

#### HU29 · Consultar saldo de puntos e historial de canjes

**Como** usuario registrado, **quiero** ver mis puntos y canjes en mi perfil, **para** conocer y controlar mis beneficios.

Sprint: S4 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. El perfil muestra el saldo actual de puntos.
2. El historial muestra recompensa, fecha y puntos utilizados.
3. Solo accedo a mi información y no existe una operación de transferencia entre usuarios.

Dependencias: HU01, HU28.

#### HU30 · Configurar y comprar combos destacados

**Como** administrador y comprador, **quiero** ofrecer y comprar combos de entrada, pochoclos y bebida, **para** acceder a una oferta con precio fijo.

Sprint: S4 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. El administrador define componentes y precio fijo del combo.
2. Los combos se destacan en la página de compra e informan qué incluyen.
3. La confirmación cobra el precio del combo y genera derechos de ingreso y retiro de todos sus componentes.

Dependencias: HU16, HU17.

Preguntas asociadas: D05, D11.

### C09 · 08/03/2020 · Próximamente, alertas, preventa y Mis películas

#### HU31 · Explorar la sección Próximamente

**Como** cliente, **quiero** ver las películas de próximos estrenos, **para** planificar mi próxima visita.

Sprint: S4 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. El administrador puede definir la fecha de estreno por película.
2. La sección muestra próximos estrenos con su información y estado de venta.
3. Si aún no hay entradas a la venta, se ofrece la acción de alerta y se evita mostrar una compra disponible.

Dependencias: HU02, HU03.

#### HU32 · Recibir alerta al abrirse la venta

**Como** usuario interesado en un estreno, **quiero** activar una alerta por película, **para** enterarme cuando se puedan comprar entradas.

Sprint: S4 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. Puedo activar una alerta asociada a una película y al destinatario autorizado.
2. La apertura de venta dispara una notificación por el canal acordado.
3. Reintentos no duplican la misma alerta y un fallo de envío queda identificado para recuperación.

Dependencias: HU31, HU33.

Preguntas asociadas: D12.

#### HU33 · Configurar preventa y retorno al precio normal

**Como** administrador, **quiero** configurar la preventa por película, **para** vender anticipadamente a un precio especial.

Sprint: S4 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. Se puede abrir la venta 7 días antes del estreno con precio especial por película.
2. Se configura el precio normal y la política/fecha de fin de preventa por película.
3. Al concluir la preventa, nuevas compras usan el precio normal; las confirmadas mantienen el precio cobrado y se prueban los instantes límite.

Dependencias: HU06, HU31.

Preguntas asociadas: D13.

#### HU34 · Ver mi historial visual de películas

**Como** usuario registrado, **quiero** consultar Mis películas con pósters, fechas y mi calificación, **para** recordar lo que vi.

Sprint: S4 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. La sección muestra póster, película, fecha y calificación propia si existe.
2. Se define y aplica de forma consistente cuándo una película cuenta como vista.
3. No se mezclan historiales de otras cuentas y se muestra un estado vacío si no hay películas.

Dependencias: HU09, HU18, HU01.

Preguntas asociadas: D14.

### C10 · 10/03/2020 · Cancelación, crédito, VIP, exportaciones, gráficos y auditoría

#### HU35 · Cancelar una compra y recibir crédito

**Como** comprador, **quiero** cancelar hasta dos horas antes de la función, **para** recuperar el importe como crédito para futuras compras.

Sprint: S5 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. La cancelación válida se acepta hasta el límite de 2 horas antes; se prueban justo el límite y un instante posterior.
2. Se cancela una sola vez, se invalidan los derechos pendientes y se libera la disponibilidad que corresponda.
3. Se acredita el importe según la política acordada, sin devolución de dinero ni acreditación duplicada.

Dependencias: HU06, HU18, HU19, HU37.

Preguntas asociadas: D15, D11.

#### HU36 · Reconocer y comprar butacas VIP

**Como** cliente, **quiero** identificar las butacas VIP y su precio superior, **para** decidir con claridad antes de pagar.

Sprint: S2 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. Las filas R, S y T se identifican como VIP en cada sala.
2. El mapa muestra la categoría y el precio superior con una leyenda accesible.
3. La selección y el resumen previo al pago informan explícitamente que se compra VIP y su costo.

Dependencias: HU04.

Nota: S2 entrega mapa y regla de precios; S2 verifica el recorrido completo de compra.

Preguntas asociadas: D05.

#### HU37 · Consultar crédito y combinarlo con otro pago

**Como** usuario con crédito, **quiero** ver mi saldo y usarlo con otro método de pago, **para** aprovecharlo en compras futuras.

Sprint: S5 | Prioridad: Alta | Estado: pendiente

**Criterios de aceptación**

1. El perfil muestra crédito disponible y el checkout permite indicar cuánto aplicar.
2. Si el crédito es insuficiente, el resto se paga con un método habilitado y se detalla el reparto.
3. La operación evita doble gasto; si falla el pago complementario, no se consume definitivamente el crédito.

Dependencias: HU01, HU06.

Preguntas asociadas: D02, D15.

#### HU38 · Exportar facturación a PDF y Excel

**Como** administrador, **quiero** exportar el reporte de facturación, **para** compartirlo y analizarlo fuera del sistema.

Sprint: S5 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. El reporte se descarga como PDF y como archivo Excel.
2. Los filtros, filas y totales coinciden con el reporte mostrado.
3. El PDF es legible y el Excel conserva fechas e importes como datos utilizables.

Dependencias: HU25, HU35, HU37.

Preguntas asociadas: D10.

#### HU39 · Consultar películas más vistas y candy más vendido

**Como** administrador, **quiero** ver gráficos semanales y mensuales de películas y el producto de candy más vendido, **para** entender la demanda.

Sprint: S5 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. Puedo alternar la agrupación semanal y mensual del gráfico de películas más vistas.
2. Se identifica el producto de candy con mayor cantidad vendida para el período.
3. Los gráficos tienen etiquetas, período y estado sin datos y coinciden con la definición acordada de venta/asistencia.

Dependencias: HU18, HU19, HU25.

Preguntas asociadas: D07, D10.

#### HU40 · Consultar el log de actividad administrativa

**Como** administrador, **quiero** ver quién realizó acciones y cuándo, **para** auditar cambios y validaciones.

Sprint: S5 | Prioridad: Media | Estado: pendiente

**Criterios de aceptación**

1. Se registran como mínimo creación de funciones, modificaciones de precio y validaciones QR, con actor, acción, entidad, fecha y hora.
2. El panel permite consultar esos registros y distinguir acciones exitosas de intentos rechazados.
3. Un cliente o empleado no puede alterar ni borrar el historial de auditoría.

Dependencias: HU17, HU20, HU18, HU19.

Nota: TEC02 instrumenta eventos desde el inicio; S5 entrega la consulta administrativa.

## Tarjetas técnicas y de entrega

### TEC01 · Resumen de requisitos y trazabilidad · S1

Fuente: Consigna, página 1

- Documentar requisitos, correos de origen, cambios y preguntas pendientes.
- Vincular cada requisito vigente a una historia y cada historia comprometida a una entrega.
- Mantener el documento al cerrar cada sprint; excluir HU41 hasta aprobación.

### TEC02 · Base Angular, Supabase, GitHub y despliegue inicial · S1

Fuente: Consigna, página 1; habilitador técnico propuesto

- Preparar repositorio, estructura Angular y conexión Supabase por entornos.
- Definir permisos por rol y protección de datos y operaciones en servidor.
- Publicar una URL de demostración inicial e instrumentar auditoría desde las primeras operaciones; actualizarla cada sprint.

### TEC03 · PWA e integración final · S6

Fuente: Consigna, página 1

- Verificar instalación PWA, manifest e iconos y comportamiento de actualización.
- Mostrar un estado claro sin conexión; no simular compras o validaciones exitosas sin confirmación del servidor.
- Probar recorridos completos de invitado, cliente, administrador y empleado en la URL desplegada.

### TEC04 · README, arquitectura y defensa oral · S6

Fuente: Consigna, página 1

- Entregar código en GitHub y README con instalación, arquitectura y decisiones técnicas.
- Vincular requisitos, demostraciones y decisiones a la versión entregada.
- Preparar un guion de defensa sobre Angular, Supabase, PWA y lógica de negocio, con datos de prueba.

### TEC05 · Cierre visual y verificación de reglas críticas · S6

Fuente: Consigna, página 1; verificación propuesta

- Revisar estilo visual propio, coherencia, navegación, formularios y estados de error.
- Verificar concurrencia de butacas, margen de 30 minutos, doble canje QR, edades, cupones, puntos, preventa y cancelación.
- Conciliar reportes con operaciones de prueba y documentar limitaciones conocidas antes de la defensa.

## Plan detallado de cada sprint

### Sprint 1 · días 1-4 · entrega día 4

**Objetivo:** Base desplegada, roles y cartelera

**Tarjetas:** HU01, HU02, HU03, HU12, HU17, HU24, TEC01, TEC02

**Demostración de entrega:** URL Angular + Supabase, registro/login y roles; admin crea/publica película y cliente busca por nombre/género; formulario de fechas ágil.

**Riesgo/dependencia:** Confirmar acceso, datos de registro y diseño. Roles y base de auditoría son habilitadores.

### Sprint 2 · días 5-8 · entrega día 8

**Objetivo:** Salas, programación y primera compra

**Tarjetas:** HU04, HU05, HU06, HU20, HU21, HU22, HU23, HU36

**Demostración de entrega:** Mapa accesible/VIP, asignación automática con 30 minutos de margen, compra invitada/registrada con restricción de edad y disponibilidad en dos sesiones.

**Riesgo/dependencia:** Concurrencia y pago son ruta crítica. Confirmar distribución accesible, recurrencias, edad del invitado y precio VIP.

### Sprint 3 · días 9-12 · entrega día 12

**Objetivo:** Operación completa: QR, candy, cupones y opiniones

**Tarjetas:** HU07, HU08, HU09, HU10, HU11, HU13, HU14, HU15, HU16, HU18, HU19, HU25

**Demostración de entrega:** PDF y QR compartido, candy y descuentos configurables, validación manual/escáner sin doble consumo; reseñas, promedio, top 3 y reporte diario base.

**Riesgo/dependencia:** Sprint de mayor carga. Secuencia: cupón/PDF -> candy -> validación -> reportes; reseñas/ranking en carril independiente si hay equipo. Ajustar tamaño de tareas según capacidad.

### Sprint 4 · días 13-16 · entrega día 16

**Objetivo:** Fidelización, combos, estrenos y preventa

**Tarjetas:** HU26, HU27, HU28, HU29, HU30, HU31, HU32, HU33, HU34

**Demostración de entrega:** Puntos y canje con historial, combo de precio fijo, Próximamente y alerta al abrir preventa, cambio a precio normal y Mis películas.

**Riesgo/dependencia:** Alta carga. No iniciar saldos ni notificaciones sin resolver políticas de acumulación, canjes, canal y límites de preventa.

### Sprint 5 · días 17-20 · entrega día 20

**Objetivo:** Cancelación, crédito, reportes finales y auditoría

**Tarjetas:** HU35, HU37, HU38, HU39, HU40

**Demostración de entrega:** Cancelar hasta 2 h antes, usar crédito con otro pago, exportar PDF/Excel, gráficos semanal/mensual y candy más vendido, consulta de log por actor/fecha.

**Riesgo/dependencia:** Conciliar cancelaciones con QR, disponibilidad, puntos, cupones, canjes y facturación. Instrumentación del log ya existe desde S1.

### Sprint 6 · días 21-24 · entrega día 24

**Objetivo:** PWA, cierre integral y preparación de entrega

**Tarjetas:** TEC03, TEC04, TEC05

**Demostración de entrega:** PWA instalable, pruebas de recorridos y reglas críticas, URL funcional, GitHub y README de arquitectura, documento de requisitos y guion de defensa.

**Riesgo/dependencia:** Reserva de estabilización. Cada sprint previo debe desplegar y probar; no acumular integración para S6.

## Ritmo de cuatro días

- Día 1: confirmar alcance, resolver dudas y cerrar diseño/datos.
- Día 2: implementar recorrido principal e integrar.
- Día 3: completar casos alternativos, permisos y pruebas críticas.
- Día 4: corregir, desplegar, demostrar y ajustar el siguiente sprint.

## Definición de terminado para cada entrega

- Criterios de aceptación demostrados y dudas que afectan la historia resueltas.
- Cambio integrado en GitHub y disponible en la URL de demostración del sprint.
- Permisos verificados por rol, validaciones en servidor y errores comprensibles.
- Pruebas proporcionales al riesgo; concurrencia y límites temporales cuando correspondan.
- Evidencia breve de demo y actualización del documento de requisitos/decisiones.

## Preguntas a validar antes de implementar

Las siguientes propuestas son decisiones sugeridas, no requisitos confirmados del cliente.

### D01 · Datos del registro

¿Todos los campos personales son obligatorios y qué opciones/validaciones se esperan?

**Resolver antes:** S1

**Propuesta a validar:** Conservar los campos de la consigna, sin inventar obligatoriedad ni usar tipo de sangre como regla comercial.

### D02 · Pago

¿Pago simulado o pasarela real, qué métodos y moneda?

**Resolver antes:** S2

**Propuesta a validar:** Demostración con pago simulado hasta confirmación; nunca presentar esa decisión como exigencia del correo.

### D03 · Edad e invitados

¿Cómo se acredita edad sin cuenta y cómo se interpreta la leyenda de adulto para +13/+18?

**Resolver antes:** S2

**Propuesta a validar:** Solicitar nacimiento también al invitado; no permitir que acompañamiento adulto eluda el bloqueo explícito del correo.

### D04 · Mismo QR para cine y candy

¿El consumo es independiente para ingreso y candy? ¿Permite entregas o ingresos parciales en compras múltiples?

**Resolver antes:** S3

**Propuesta a validar:** Un QR con derechos separados; consumir cine no anula candy y viceversa. Esto concilia C04 con C05, pero requiere validación.

### D05 · Precios y descuentos

¿Los cupones se acumulan, cubren candy/combos/VIP/preventa y qué ocurre con cupones ya emitidos al cambiar el porcentaje?

**Resolver antes:** S3; precio VIP en S2

**Propuesta a validar:** Un cupón por compra, política versionada y resumen de cálculo explícito; no implementarlo como regla confirmada sin acordarlo.

### D06 · Reseñas

¿Se requiere cuenta/compra previa, cuántas reseñas por persona, escala de estrellas y máximo de comentario?

**Resolver antes:** S3

**Propuesta a validar:** 1 a 5 estrellas, hasta 280 caracteres y una reseña editable por cuenta/película, a validar.

### D07 · Rankings

¿Top 3 histórico o por período? ¿Más vistas cuenta entradas vendidas o ingresos validados?

**Resolver antes:** S3 y S5

**Propuesta a validar:** Top 3 por entradas confirmadas netas de cancelación; vistas por ingresos validados, sujeto a aprobación.

### D08 · Programación de funciones

¿Qué rango de fechas tiene una recurrencia y todas las salas admiten 2D/3D/4D/5D?

**Resolver antes:** S2

**Propuesta a validar:** Rango inicio/fin explícito y capacidades por sala si corresponde; no generar recurrencia indefinida.

### D09 · Distribución accesible

¿J y K se sustituyen por una única fila de 14 lugares? ¿Cómo se etiqueta?

**Resolver antes:** S2

**Propuesta a validar:** 18 filas regulares x 28 + 14 accesibles = 518 lugares. R/S/T aportan 84 VIP dentro de ese total, sin sumar capacidad. Confirmar antes de modelar.

### D10 · Contabilidad y reportes

¿Cómo se computan descuentos, créditos, canjes, cancelaciones y combos? ¿Zona horaria y corte del día?

**Resolver antes:** S3; revisar S5

**Propuesta a validar:** Separar cobros, crédito emitido/usado y canjes; definir facturación antes de comparar totales.

### D11 · Puntos

¿Se calculan sobre importe neto, cómo se redondean centavos y qué ocurre al pagar con crédito/canjear/cancelar?

**Resolver antes:** S4

**Propuesta a validar:** No duplicar puntos por reutilizar crédito; registrar movimientos reversibles y acordar base/redondeo.

### D12 · Alertas

¿Notificación por email, push PWA o dentro de la app? ¿Requiere registro?

**Resolver antes:** S4

**Propuesta a validar:** Elegir un canal y definir consentimiento y recuperación de fallos antes de implementar.

### D13 · Preventa

¿Finaliza al estreno o en otra fecha configurable? ¿Se configura también la anticipación de 7 días?

**Resolver antes:** S4

**Propuesta a validar:** Inicio por defecto estreno menos 7 días; fin explícito por película, a validar.

### D14 · Mis películas

¿Vista significa función pasada o ingreso efectivamente validado?

**Resolver antes:** S4

**Propuesta a validar:** Usar ingreso validado y no mostrar compras canceladas como películas vistas.

### D15 · Cancelación

¿Cómo recibe crédito un invitado? ¿Se cancela compra completa o por ítem? ¿Qué sucede con candy retirado, canjes y puntos?

**Resolver antes:** S5

**Propuesta a validar:** Exigir vinculación segura a una cuenta para crédito; definir cancelación de derechos consumidos y restauración de beneficios antes de desarrollar.

