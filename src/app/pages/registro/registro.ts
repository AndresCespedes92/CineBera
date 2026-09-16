import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { supabase } from '../../supabase';


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
    RouterLink
  ],

  templateUrl: './registro.html',
  styleUrl: './registro.css'
})


export class Registro {


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
      validators: [
        Validators.required,
        Validators.minLength(2)
      ]
    }),

    apellido: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2)
      ]
    }),

    email: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email
      ]
    }),

    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(6)
      ]
    }),

    fechaNacimiento: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    }),

    grupoSanguineo: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    }),

    colorOjos: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required
      ]
    }),

    diasVacaciones: new FormControl(0, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(0)
      ]
    })

  });


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