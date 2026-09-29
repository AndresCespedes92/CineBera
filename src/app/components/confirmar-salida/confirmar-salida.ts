import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-confirmar-salida',
  imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>Cambios sin guardar</h2>
    <mat-dialog-content
      >Tenés cambios sin guardar. ¿Querés descartarlos y continuar?</mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button matButton="outlined" [mat-dialog-close]="false">Seguir editando</button
      ><button matButton="filled" [mat-dialog-close]="true">
        Descartar cambios
      </button></mat-dialog-actions
    >`,
})
export class ConfirmarSalida {}
