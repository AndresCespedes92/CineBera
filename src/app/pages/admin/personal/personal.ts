import { Component, HostListener, signal } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { map, take } from 'rxjs';
import { PageHeader } from '../../../components/page-header/page-header';
import { ConfirmarSalida } from '../../../components/confirmar-salida/confirmar-salida';
import { crearFormularioRegistro } from '../../../forms/registro-form';
import { Auth } from '../../../services/auth';
import { Usuario, NuevoPerfil, EmpleadoListado } from '../../../services/usuario';
@Component({
  selector: 'app-personal',
  imports: [ReactiveFormsModule, MatButtonModule, PageHeader],
  templateUrl: './personal.html',
  styleUrls: ['../../registro/registro.css', './personal.css'],
})
export class Personal {
  empleados = signal<EmpleadoListado[]>([]);
  cargando = signal(false);
  guardando = signal(false);
  mostrarFormulario = signal(false);
  errorListado = signal('');
  errorAlta = signal('');
  mensaje = signal('');
  form = crearFormularioRegistro();
  perfilPendiente = signal<NuevoPerfil | null>(null);
  private requiereConfirmacion = false;
  dias = Array.from({ length: 31 }, (_, i) => i + 1);
  meses = Array.from({ length: 12 }, (_, i) => i + 1);
  anios = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  grupos = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  colores = ['Marrón', 'Negro', 'Verde', 'Azul', 'Gris', 'Otro'];
  constructor(
    private auth: Auth,
    private usuarios: Usuario,
    private dialog: MatDialog,
  ) {
    // smallint: la tabla solo acepta enteros dentro de este rango.
    this.form.controls.diasVacaciones.addValidators([
      Validators.max(32767),
      Validators.pattern(/^\d+$/),
    ]);
    this.form.controls.nombre.addValidators(Validators.pattern(/\S/));
    this.form.controls.apellido.addValidators(Validators.pattern(/\S/));
  }
  ngOnInit() {
    void this.cargar();
  }
  private async comprobarAdmin() {
    const s = await this.auth.obtenerSesion();
    if (!s?.user?.id || s.user.is_anonymous)
      throw new Error('Iniciá sesión con una cuenta administradora.');
    const { data, error } = await this.usuarios.obtenerPerfil(s.user.id);
    if (error || data?.rol !== 'admin')
      throw new Error('Esta acción requiere una cuenta administradora.');
  }
  async cargar() {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.errorListado.set('');
    this.empleados.set([]);
    try {
      await this.comprobarAdmin();
      const { data, error } = await this.usuarios.listarEmpleados();
      if (error) throw Error();
      this.empleados.set(data ?? []);
    } catch {
      this.errorListado.set('No se pudo consultar Personal. Verificá tu sesión y reintentá.');
    } finally {
      this.cargando.set(false);
    }
  }
  nuevo() {
    this.mostrarFormulario.set(true);
    this.mensaje.set('');
    this.errorAlta.set('');
  }
  async guardar() {
    if (this.guardando()) return;
    if (!this.perfilPendiente() && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.errorAlta.set('');
    this.mensaje.set('');
    try {
      await this.comprobarAdmin();
      if (!this.perfilPendiente()) {
        const v = this.form.getRawValue();
        const alta = await this.auth.registrarEmpleado(v.email.trim(), v.password);
        this.requiereConfirmacion = alta.requiereConfirmacion;
        // Auth y perfiles no son una transacción: el reintento guarda solo este perfil.
        this.perfilPendiente.set({
          id: alta.id,
          nombre: v.nombre.trim(),
          apellido: v.apellido.trim(),
          fecha_nacimiento:
            String(v.anioNacimiento) +
            '-' +
            String(v.mesNacimiento).padStart(2, '0') +
            '-' +
            String(v.diaNacimiento).padStart(2, '0'),
          grupo_sanguineo: v.grupoSanguineo,
          color_ojos: v.colorOjos,
          dias_vacaciones: v.diasVacaciones,
          rol: 'empleado',
        });
        this.form.controls.password.reset();
        this.form.controls.confirmarPassword.reset();
      }
      const perfil = this.perfilPendiente()!;
      const { error } = await this.usuarios.crearPerfilEmpleado(perfil);
      if (error) {
        // Un INSERT pudo completarse aunque se perdiera la respuesta. No sobrescribimos otra cuenta.
        const existente = await this.usuarios.obtenerPerfil(perfil.id);
        if (
          existente.error ||
          !existente.data ||
          !Object.entries(perfil).every(([campo, valor]) => existente.data[campo] === valor)
        )
          throw Error();
      }
      this.perfilPendiente.set(null);
      this.form.reset();
      this.mostrarFormulario.set(false);
      this.mensaje.set(
        this.requiereConfirmacion
          ? 'Empleado creado. Debe confirmar su correo antes de iniciar sesión.'
          : 'Empleado creado correctamente.',
      );
      await this.cargar();
    } catch (error) {
      this.errorAlta.set(
        this.perfilPendiente()
          ? 'La cuenta se creó, pero no pudimos confirmar el perfil. Reintentá sin salir de esta pantalla. Si la cerrás, será necesaria una revisión manual del alta.'
          : error instanceof Error
            ? error.message
            : 'No se pudo completar el alta.',
      );
    } finally {
      this.guardando.set(false);
    }
  }
  cancelar() {
    if (this.guardando() || this.perfilPendiente()) return;
    const decision = this.puedeSalir();
    const limpiar = () => {
      this.form.reset();
      this.mostrarFormulario.set(false);
      this.errorAlta.set('');
    };
    if (typeof decision === 'boolean') {
      if (decision) limpiar();
    } else
      decision.subscribe((acepta) => {
        if (acepta) limpiar();
      });
  }
  /** Reutiliza CanDeactivate para el borrador y avisa antes de perder un alta parcial. */
  puedeSalir() {
    if (this.guardando()) return false;
    if (!this.form.dirty && !this.perfilPendiente()) return true;
    return this.dialog
      .open(ConfirmarSalida, { width: '420px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .pipe(
        map((r) => r === true),
        take(1),
      );
  }
  @HostListener('window:beforeunload', ['$event']) antesDeCerrar(event: BeforeUnloadEvent) {
    if (this.guardando() || this.form.dirty || this.perfilPendiente()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
