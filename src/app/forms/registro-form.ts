import { FormControl, FormGroup, Validators } from '@angular/forms';
import { confirmarPasswordValidator } from '../validators/confirmar-password.validator';
import { fechaNacimientoValidator } from '../validators/fecha-nacimiento.validator';
/** Comparte reglas, no estado: cada pantalla obtiene un formulario nuevo. */
export function crearFormularioRegistro() {
  return new FormGroup(
    {
      nombre: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(2),
          // Solo letras y espacios.
          // Incluimos caracteres habituales del español.
          Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/),
        ],
      }),
      apellido: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(2),
          // Solo letras y espacios.
          // Incluimos caracteres habituales del español.
          Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/),
        ],
      }),

      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),

      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),

      // Este campo individualmente solo debe ser obligatorio.
      confirmarPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),

      diaNacimiento: new FormControl<number | null>(null, {
        validators: [Validators.required],
      }),

      mesNacimiento: new FormControl<number | null>(null, {
        validators: [Validators.required],
      }),

      anioNacimiento: new FormControl<number | null>(null, {
        validators: [Validators.required],
      }),

      grupoSanguineo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),

      colorOjos: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),

      diasVacaciones: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)],
      }),
    },
    {
      // Este validador analiza el formulario completo.
      validators: [confirmarPasswordValidator, fechaNacimientoValidator],
    },
  );
}
