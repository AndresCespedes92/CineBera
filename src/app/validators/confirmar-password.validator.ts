import {
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

/**
 * Validador personalizado para comprobar que
 * password y confirmarPassword tengan el mismo valor.
 *
 * Recibe el FormGroup completo porque necesitamos
 * comparar dos controles diferentes.¿Encuentro un problema Si->Error No->Null
 */
export function confirmarPasswordValidator(formulario: AbstractControl): ValidationErrors | null 
{
  // Obtenemos los dos controles que queremos comparar.
  const password = formulario.get('password');
  const confirmarPassword = formulario.get('confirmarPassword');

  // Si alguno todavía no existe, no podemos comparar.
  if (!password || !confirmarPassword) {
    return null;
  }

  // Si los valores son diferentes, devolvemos un error.
  if (password.value !== confirmarPassword.value) {
    return {
      passwordsNoCoinciden: true
    };
  }

  // null significa: "no encontré ningún error".
  return null;
}