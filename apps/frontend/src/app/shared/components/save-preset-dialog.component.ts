import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface SavePresetDialogData {
  defaultName?: string;
}

@Component({
  selector: 'app-save-preset-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Save filter preset</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Preset name</mat-label>
        <input matInput [(ngModel)]="name" (keyup.enter)="save()" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .full {
      width: 100%;
      min-width: 280px;
    }
  `,
})
export class SavePresetDialogComponent {
  dialogRef = inject(MatDialogRef<SavePresetDialogComponent, string | undefined>);
  data = inject<SavePresetDialogData>(MAT_DIALOG_DATA);

  name = this.data?.defaultName ?? '';

  save() {
    const n = this.name.trim();
    if (n) {
      this.dialogRef.close(n);
    }
  }
}
