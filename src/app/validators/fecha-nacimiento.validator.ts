import {
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

/**
 * Valida la fecha de nacimiento formada por
 * diaNacimiento, mesNacimiento y anioNacimiento.
 *
 * Comprueba:
 * 1. Que la combinación día/mes/año sea una fecha real.
 * 2. Que la fecha no sea futura.
 */
export function fechaNacimientoValidator(
  formulario: AbstractControl
): ValidationErrors | null {

  const dia = formulario.get('diaNacimiento')?.value;
  const mes = formulario.get('mesNacimiento')?.value;
  const anio = formulario.get('anioNacimiento')?.value;

  /*
   * Si todavía falta seleccionar algún dato,
   * no hacemos esta validación.
   *
   * Validators.required se encargará de detectar
   * individualmente los campos vacíos.
   */
  if (!dia || !mes || !anio) {
    return null;
  }

  /*
   * JavaScript trabaja los meses de Date desde 0:
   *
   * Enero     = 0
   * Febrero   = 1
   * ...
   * Diciembre = 11
   *
   * Por eso utilizamos mes - 1.
   */
  const fecha = new Date(anio, mes - 1, dia);

  /*
   * JavaScript puede "corregir" automáticamente
   * una fecha inexistente.
   *
   * Ejemplo:
   * new Date(2000, 1, 31)
   *
   * puede transformarse en una fecha de marzo.
   *
   * Por eso comprobamos que la fecha creada
   * siga teniendo exactamente los valores originales.
   */
  const fechaEsReal =
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia;

  if (!fechaEsReal) {
    return {
      fechaInvalida: true
    };
  }

  // No permitimos fechas posteriores al día actual.
  const hoy = new Date();

  if (fecha > hoy) {
    return {
      fechaFutura: true
    };
  }

  // Si llegamos hasta acá, la fecha es correcta.
  return null;
}