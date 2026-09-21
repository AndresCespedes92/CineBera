import {
  AbstractControl,
  ValidationErrors
} from '@angular/forms';


/**
 * CUSTOM VALIDATOR: confirmarPasswordValidator
 *
 * OBJETIVO:
 * Comprobar que los campos "password" y
 * "confirmarPassword" tengan exactamente el mismo valor.
 *
 * 
 * --------------------------------------------------
 * Un Validators.required o Validators.minLength puede
 * analizar un campo individual.
 *
 * En este caso necesitamos comparar DOS controles:
 *
 * password ───────────┐
 *                     ├──► confirmarPasswordValidator
 * confirmarPassword ──┘
 *
 * Por eso este validator se aplica al FormGroup.
 *
 *
 * PARÁMETRO:
 * --------------------------------------------------
 * formulario: AbstractControl
 *
 * Angular le entrega a esta función el control que
 * estamos validando. En nuestro caso será el FormGroup
 * que contiene password y confirmarPassword.
 *
 *
 * RETORNO:
 * --------------------------------------------------
 * ValidationErrors | null
 *
 * ValidationErrors:
 *   significa que encontramos un error.
 *
 * null:
 *   significa que este validator no encontró errores.
 */
export function confirmarPasswordValidator(
  formulario: AbstractControl
): ValidationErrors | null {

  /*
   * Buscamos dentro del formulario los dos controles
   * que necesitamos comparar.
   *
   * formulario
   * ├── password
   * └── confirmarPassword
   */
  const password =
    formulario.get('password');

  const confirmarPassword =
    formulario.get('confirmarPassword');


  /*
   * Antes de acceder a .value comprobamos que
   * ambos controles realmente existan.
   *
   * El operador || significa "O".
   *
   * Si alguno no existe, este validator no puede
   * realizar la comparación.
   */
  if (!password || !confirmarPassword) {
    return null;
  }


  /*
   * !== significa "estrictamente diferente".
   *
   * Ejemplo:
   *
   * password.value          = "cine123"
   * confirmarPassword.value = "cine456"
   *
   * Son diferentes:
   *       ↓
   * devolvemos un ValidationErrors.
   */
  if (password.value !== confirmarPassword.value) {

    return {
      passwordsNoCoinciden: true
    };
  }


  /*
   * Si llegamos hasta acá significa que
   * ambas contraseñas coinciden.
   *
   * Para Angular:
   * null = este validator no encontró errores.
   */
  return null;
}