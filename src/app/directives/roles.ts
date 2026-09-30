import { Directive, Input, OnChanges, TemplateRef, ViewContainerRef } from '@angular/core';

/**
 * Controla solamente la visibilidad: el guard sigue protegiendo la ruta.
 * Recibe el rol que el componente ya consultó con Auth/Usuario, para no
 * repetir consultas ni crear otro estado de autenticación.
 */
@Directive({ selector: '[appRoles]' })
export class Roles implements OnChanges {
  @Input({ required: true }) appRoles: readonly string[] = [];
  @Input({ required: true }) appRolesActual: string | null = null;
  private visible = false;

  constructor(
    private template: TemplateRef<unknown>,
    private container: ViewContainerRef,
  ) {}

  ngOnChanges(): void {
    const mostrar = !!this.appRolesActual && this.appRoles.includes(this.appRolesActual);
    // Conservamos la vista mientras el permiso no cambie (también su foco).
    if (mostrar === this.visible) return;
    this.visible = mostrar;
    if (mostrar) this.container.createEmbeddedView(this.template);
    else this.container.clear();
  }
}
