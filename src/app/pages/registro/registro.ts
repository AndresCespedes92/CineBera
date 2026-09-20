import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { supabase } from '../../supabase';
import { confirmarPasswordValidator } from '../../validators/confirmar-password.validator';
import { NgClass } from '@angular/common';
import {
  fechaNacimientoValidator
} from '../../validators/fecha-nacimiento.validator';

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
  imports: [
    ReactiveFormsModule,
    RouterLink, NgClass
  ],

  templateUrl: './registro.html',
  styleUrl: './registro.css'
})


export class Registro {

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
registroForm = new FormGroup({

  nombre: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2),
      // Solo letras y espacios.
    // Incluimos caracteres habituales del español.
    Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/)]
  }),
  apellido: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required,Validators.minLength(2),
      // Solo letras y espacios.
    // Incluimos caracteres habituales del español.
    Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/)]
  }),

  email: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required,Validators.email]
  }),

  password: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required,Validators.minLength(6)]
  }),

  // Este campo individualmente solo debe ser obligatorio.
  confirmarPassword: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required]
  }),

  diaNacimiento: new FormControl<number | null>(null, {
  validators: [Validators.required]
  }),

  mesNacimiento: new FormControl<number | null>(null, {
    validators: [Validators.required]
  }),

  anioNacimiento: new FormControl<number | null>(null, {
    validators: [Validators.required]
  }),

  grupoSanguineo: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required]
  }),

  colorOjos: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required]
  }),

  diasVacaciones: new FormControl(0, {
    nonNullable: true,
    validators: [Validators.required,Validators.min(0)]
  })

}, 
  {
    // Este validador analiza el formulario completo.
    validators: [
  confirmarPasswordValidator,
  fechaNacimientoValidator
]
  });

  
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

  if (this.registroForm.invalid) {
    this.registroForm.markAllAsTouched();
    console.log('El formulario contiene errores');
    return;
  }

    /*
   * Es como sacar una fotocopia del formulario
   */
  const datosFormulario =
    this.registroForm.getRawValue();

  const { data, error } =
    await supabase.auth.signUp({
      email: datosFormulario.email,
      password: datosFormulario.password
    });

  if (error) {
    console.error(
      'Error al registrar usuario:',
      error.message
    );

    return;
  }

  console.log(
    'Usuario registrado:',
    data
  );

}

}