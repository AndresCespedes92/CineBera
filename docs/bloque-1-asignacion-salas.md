# Bloque 1 — Asignación automática de salas en TypeScript

Rama: `fix/asignacion-automatica-salas-simple`, creada desde main actualizado.
La rama anterior fue descartada, sin incorporarla a main.

## Qué hace cada parte

**Funciones (componente):** recibe película, días de la semana, horario, formato
e idioma. Arma un borrador por cada fecha elegida. Al guardar, envía las solicitudes
a FuncionService. Mientras espera, deshabilita el guardado para evitar dobles clics.
Presenta los errores o las salas realmente devueltas por Supabase.

**FuncionService:** consulta los datos actuales, calcula los intervalos, busca la
primera sala disponible y planifica el lote completo antes de insertar. La decisión
de asignación está en este servicio, no en el componente.

**SalaService:** reutiliza `obtenerSalasActivas()`, que consulta salas con
`activa = true` y las ordena por ID. La planificación usa el parámetro `lanzarError`
para detenerse ante una consulta fallida. Los consumidores anteriores mantienen su
comportamiento ante errores; no se modificaron otras pantallas.

**Supabase:** entrega los registros mediante select y guarda el array mediante insert.
Este bloque no cambia tablas ni agrega archivos SQL, migraciones o dependencias.

Flujo:

```text
Funciones
  → FuncionService
    → SalaService → Supabase select de salas
    → Supabase select de películas y funciones
    → planificación en arrays TypeScript
    → Supabase insert del array completo
  → resultado
Funciones → template
```

## Conceptos para estudiar

Un **Component** coordina una pantalla y su template. Un **Service** concentra
operaciones reutilizables. La **Dependency Injection** permite que Angular entregue
una instancia de SalaService al constructor de FuncionService, y los servicios al
componente. No se crean dependencias circulares.

Las **interfaces** describen la forma de los datos. `SolicitudFuncion` contiene
lo elegido por el administrador y no tiene sala. `NuevaFuncionSupabase` incluye
`sala_id` porque cada función persistida necesita identificar dónde se proyecta.
`FuncionGuardada` incluye también el ID que devuelve la base.

Un **array** es una colección de elementos. Usamos arrays para las salas, solicitudes,
ocupaciones existentes y funciones que vamos a guardar. `push()` agrega un elemento;
por ejemplo, una nueva ocupación que todavía no se ha guardado.

**for** recorre los elementos uno por uno. El primer recorrido procesa las solicitudes;
el segundo prueba las salas en orden. Al encontrar una libre, `return sala` termina
la búsqueda. No se busca equilibrar la cantidad de funciones entre salas.

**some()** devuelve true si al menos un elemento cumple una condición. Aquí pregunta
si alguna ocupación de esa misma sala se superpone con el nuevo intervalo. Si devuelve
false, la sala está disponible según los datos consultados.

**async/await** permite esperar operaciones que devuelven una Promise. Esperamos las
consultas antes de planificar y esperamos el insert antes de anunciar éxito. Esto
ordena el flujo dentro de ese navegador; no coordina a otros administradores.

**ngModel** conecta los controles con propiedades del componente. Los eventos de
las casillas actualizan las fechas seleccionadas. **@if** muestra carga, errores,
pendientes o resultados; **@for** recorre días, tarjetas y asignaciones.

Se conservan standalone components, OnInit, RouterLink, eventos, bindings y el
ChangeDetectorRef que ya utilizaba esta pantalla.

## Cómo obtenemos la disponibilidad

Se consultan salas activas ordenadas por ID y las películas de las solicitudes,
incluyendo su duración, formatos e idiomas. Se leen funciones activas con la duración
de su película usando la relación existente entre funciones y películas:

```typescript
supabase.from('funciones')
  .select('sala_id, fecha, hora, peliculas(duracion)')
  .eq('activa', true)
  .order('id')
  .range(desde, desde + tamanioPagina - 1);
```

La lectura avanza por páginas de 1000 filas para contemplar también los registros
que excedan el límite habitual de una respuesta. Se consideran todas las fechas,
porque una película puede empezar un día y terminar al siguiente. Si una consulta
falla o faltan datos necesarios, se informa el problema y no se intenta insertar.

## Cómo detectamos conflictos y los 30 minutos

Creamos un Date combinando fecha y hora. El final se calcula sumando la duración
de la película y los 30 minutos obligatorios. Hacemos lo mismo con las funciones
existentes. No comparamos solamente textos como "18:00" y "20:00".

```typescript
const tieneConflicto = ocupaciones.some(funcion =>
  funcion.salaId === sala.id &&
  inicio < funcion.fin &&
  fin > funcion.inicio
);
```

Si ambos intervalos se cruzan, hay conflicto. El margen se incluye en ambos finales,
por lo que funciona tanto frente a una función anterior como frente a una posterior.
Los extremos iguales se permiten.

| Caso | Resultado |
|---|---|
| Existente a las 18:00, duración 120; nueva a las 20:29 | Conflicto |
| Misma existente; nueva a las 20:30 | Permitido |
| Existente a las 21:00; nueva de 120 minutos a las 18:31 | Conflicto |
| Misma existente; nueva a las 18:30 | Permitido |
| Inicio 23:30, duración 120 y margen 30 | Ocupa hasta las 02:00 del siguiente día |

Se usan fechas locales del calendario del cine. No se agregan restricciones de
compatibilidad por sala: todas admiten los formatos e idiomas de la película.
Se conserva la validación existente de nuevas funciones desde las 17:00.

## Semana y planificación antes del guardado

La semana sigue siendo jueves → miércoles. Inicialmente están seleccionados todos
los días; se pueden elegir sólo algunos. Agregar un horario genera una solicitud
por cada fecha seleccionada. Se puede agregar otro horario al mismo borrador.

Para guardar:

1. Se consultan los datos actuales de Supabase.
2. Se crea un array con las ocupaciones existentes y otro con las funciones a guardar.
3. Se busca una sala para cada solicitud usando for y some().
4. Después de asignarla, se agrega su intervalo al array de ocupaciones. La siguiente
   solicitud también comprueba ese intervalo, aunque todavía no esté persistido.
5. Si una fecha no tiene sala, se devuelve un error con día/fecha/horario y no se
   ejecuta ningún insert. El componente conserva el borrador para corregirlo.
6. Si todas tienen sala, se realiza una sola llamada:

```typescript
supabase.from('funciones').insert(funcionesParaGuardar).select();
```

Esta planificación previa evita que nuestro flujo guarde un lote parcialmente
planificado. **No garantiza coordinación entre la lectura de disponibilidad y la
escritura frente a otros administradores.**

Cada fecha puede recibir una sala diferente. Después del guardado se muestra el
resultado recibido, por ejemplo: lunes 18:00 — Sala 1, martes 18:00 — Sala 3.
La vista consulta toda la semana y la baja lógica actúa sobre el ID de una función
concreta, para no alterar otras fechas por compartir película u horario.

## Pruebas

Los tests específicos ejecutan el algoritmo real de FuncionService con el acceso a
Supabase simulado. No crean registros de prueba en la base. Cubren:

- Primera sala libre, salto a la segunda y salto sobre varias salas ocupadas.
- Falta de salas; error con fecha/hora y ausencia de insert.
- Margen exacto de 30 minutos y rechazo con 29 minutos.
- Conflicto con función anterior y posterior; cruce de medianoche en ambos sentidos.
- Asignaciones del mismo lote y salas distintas por fecha.
- Ningún insert cuando falla una fecha posterior del lote.
- Un solo insert del array, fallo de lectura, fallo de guardado y segunda página.
- Validaciones de fecha/duración y formatos sin compatibilidades por sala.
- Componente sin sala manual, resultado asignado, doble clic y carga semanal.
- Template sin selector de sala y con siete casillas de días.

```powershell
npm test -- --watch=false --ts-config tests/tsconfig.asignacion.json --include src/tests/asignacion-salas.spec.ts
npm run build
```

Resultado verificado: **31 tests específicos aprobados** y **build de producción
correcto**. Permanecen las advertencias de budget inicial (514,22 kB frente a 500 kB)
y CommonJS. La suite general se ejecutó y conserva sus 13 errores de compilación.

Los 13 errores heredados de la suite general están fuera del alcance y no se
modifican. Las pruebas específicas no equivalen a una sesión completa de usuario
en un navegador contra Supabase real.

## Limitaciones conocidas

**El sistema valida disponibilidad antes de guardar y evita superposiciones en el
flujo normal. Una carrera exacta entre dos administradores simultáneos queda como
limitación conocida de esta implementación académica.**

Si se interrumpe la conexión después de enviar el insert, revisar/recargar la
programación antes de reintentar: el servidor podría haber guardado aunque el
navegador no haya recibido la respuesta. También pueden cambiar datos mientras
se leen las distintas páginas. Esta solución no pretende eliminar esas carreras.

Los permisos de la base y demás pendientes de seguridad siguen fuera de este bloque.
No hubo cambios remotos de esquema ni de datos durante esta nueva implementación.

## Explicación para defensa

“El administrador elige la película, los días, horario, formato e idioma, pero no
la sala. FuncionService obtiene las salas y las funciones existentes desde Supabase.
Después recorre las salas con un for y usa some para comprobar si alguna función
existente genera un conflicto. Se tienen en cuenta la duración y los treinta minutos
entre funciones. Cuando encuentra la primera sala disponible la asigna. Antes de
guardar planificamos todo el lote en memoria, incluyendo las nuevas asignaciones,
para no insertar si algún día no tiene sala disponible. Finalmente guardamos el
array completo en Supabase y mostramos qué sala recibió cada función. La posible
carrera entre dos administradores simultáneos queda como limitación conocida.”
