import { MatButtonModule } from '@angular/material/button';
import { Component } from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {crearFormularioRegistro} from '../../forms/registro-form';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { NgClass } from '@angular/common';
import {
  Usuario,
  NuevoPerfil
} from '../../services/usuario';



@Component({
  selector: 'app-registro',

  /*
   * ReactiveFormsModule:
   * nos permite trabajar con formularios reactivos.
   *
   * RouterLink:
   * lo utilizaremos para que el cliente pueda
   * volver al Login.
   */
  imports: [MatButtonModule,
    ReactiveFormsModule,
    RouterLink, NgClass
  ],

  templateUrl: './registro.html',
  styleUrl: './registro.css'
})


export class Registro {

  constructor(
  private authService: Auth,
  private usuarioService: Usuario
) {}

  // Array [1, 2, 3, ..., 31]
dias = Array.from(
  { length: 31 },
  (_, indice) => indice + 1
);


// Meses que mostraremos al usuario.
meses = [
  { numero: 1, nombre: 'Enero' },
  { numero: 2, nombre: 'Febrero' },
  { numero: 3, nombre: 'Marzo' },
  { numero: 4, nombre: 'Abril' },
  { numero: 5, nombre: 'Mayo' },
  { numero: 6, nombre: 'Junio' },
  { numero: 7, nombre: 'Julio' },
  { numero: 8, nombre: 'Agosto' },
  { numero: 9, nombre: 'Septiembre' },
  { numero: 10, nombre: 'Octubre' },
  { numero: 11, nombre: 'Noviembre' },
  { numero: 12, nombre: 'Diciembre' }
];


// Generamos una lista de años.
// Por ahora mostramos desde el año actual hacia atrás.
anioActual = new Date().getFullYear();

anios = Array.from(
  { length: 100 },
  (_, indice) => this.anioActual - indice
);


  /*
   * FormGroup representa el formulario completo.
   *
   * Podemos imaginarlo como una ficha de inscripción.
   * Cada FormControl representa uno de los campos
   * de esa ficha.
   */
registroForm = crearFormularioRegistro();


  /*
   * AGREGAR VALIDAR - CONFIRMAR CONTRASEÑA
   */


  /**
 * Evita el ingreso de números y caracteres especiales
 * en campos que solamente deben contener letras.
 */
soloLetras(event: KeyboardEvent): void {
  const tecla = event.key;
  // Permitimos teclas necesarias para editar/navegar.
  const teclasPermitidas = [
    'Backspace',
    'Delete',
    'Tab',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End'
  ];
  if (teclasPermitidas.includes(tecla)) {
    return;
  }
  // Si no es una letra ni un espacio, bloqueamos la tecla.
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]$/.test(tecla)) {
    event.preventDefault();
  }
}

  /*
   * Este método se ejecutará cuando el usuario
   * intente registrarse.
   */
  async registrar(): Promise<void> {

  /*
   * Primera barrera:
   * si existe cualquier error de validación,
   * no intentamos registrar al usuario.
   */
  if (this.registroForm.invalid) {

    /*
     * Hace que Angular considere que el usuario
     * interactuó con todos los campos.
     *
     * Así pueden mostrarse los errores visuales.
     */
    this.registroForm.markAllAsTouched();

    return;
  }


  // Extraemos email y password del formulario.
  const email =
    this.registroForm.controls.email.value;

  const password =
    this.registroForm.controls.password.value;


  /*
   * PASO 1:
   * Crear la identidad del usuario.
   *
   * RegistroComponent no habla directamente
   * con Supabase. Delega en AuthService.
   */
  const { data, error } =
    await this.authService.registrar(
      email,
      password
    );


  /*
   * Si Auth falla, no podemos crear el perfil.
   */
  if (error) {
    console.error(
      'Error al registrar usuario:',
      error.message
    );

    return;
  }


  /*
   * Verificamos que Supabase haya devuelto
   * efectivamente el usuario creado.
   */
  if (!data.user) {
    console.error(
      'No se obtuvo el usuario creado.'
    );

    return;
  }


  /*
   * PASO 2:
   * Convertir Día / Mes / Año al formato
   * YYYY-MM-DD que utilizaremos en la BD.
   */
  const dia = String(
    this.registroForm.controls.diaNacimiento.value
  ).padStart(2, '0');

  const mes = String(
    this.registroForm.controls.mesNacimiento.value
  ).padStart(2, '0');

  const anio =
    this.registroForm.controls.anioNacimiento.value;

  const fechaNacimiento =
    `${anio}-${mes}-${dia}`;


  /*
   * PASO 3:
   * Construimos el objeto que representa
   * la fila que queremos guardar en "perfiles".
   *
   * El ID es EXACTAMENTE el UUID generado
   * previamente por Supabase Auth.
   */
  const nuevoPerfil: NuevoPerfil = {

    id: data.user.id,

    nombre:
      this.registroForm.controls.nombre.value,

    apellido:
      this.registroForm.controls.apellido.value,

    fecha_nacimiento:
      fechaNacimiento,

    grupo_sanguineo:
      this.registroForm.controls.grupoSanguineo.value,

    color_ojos:
      this.registroForm.controls.colorOjos.value,

    dias_vacaciones:
      this.registroForm.controls.diasVacaciones.value,

    /*
     * El registro público siempre crea clientes.
     *
     * El usuario NO puede elegir ser administrador
     * o empleado desde esta pantalla.
     */
    rol: 'cliente'
  };


  /*
   * PASO 4:
   * UsuarioService se encarga de insertar
   * el perfil en nuestra tabla.
   */
  const { error: perfilError } =
    await this.usuarioService.crearPerfil(
      nuevoPerfil
    );


  if (perfilError) {
    console.error(
      'Error al crear perfil:',
      perfilError.message
    );

    return;
  }


  console.log(
    'Usuario y perfil creados correctamente.'
  );

  /*
   * Acá conservá la navegación que ya utilizabas
   * después de registrar correctamente.
   */
}

}