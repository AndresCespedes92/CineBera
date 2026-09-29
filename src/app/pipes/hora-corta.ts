import { Pipe, PipeTransform } from '@angular/core';

/** Presenta la hora de la función sin segundos ni conversiones de zona horaria. */
@Pipe({ name: 'horaCorta', standalone: true })
export class HoraCortaPipe implements PipeTransform {
  transform(hora: string | null | undefined): string {
    if (!hora || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/.test(hora)) return '—';
    return hora.slice(0, 5);
  }
}
