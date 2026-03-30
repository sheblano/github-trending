import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  RepoInsightsPanelComponent,
  type RepoInsightsPanelData,
} from './repo-insights-panel.component';

export interface RepoInsightsDialogData {
  insight: RepoInsightsPanelData;
  onReadme: () => void;
}

@Component({
  selector: 'app-repo-insights-dialog',
  standalone: true,
  imports: [RepoInsightsPanelComponent],
  template: `
    <app-repo-insights-panel
      [data]="data.insight"
      (readmeClick)="onReadme()"
      (closeClick)="close()"
    />
  `,
  styles: `
    :host {
      display: block;
    }
    :host ::ng-deep .insights-card {
      box-shadow: none !important;
    }
  `,
})
export class RepoInsightsDialogComponent {
  private ref = inject(MatDialogRef<RepoInsightsDialogComponent>);
  readonly data = inject<RepoInsightsDialogData>(MAT_DIALOG_DATA);

  onReadme(): void {
    this.data.onReadme();
    this.ref.close();
  }

  close(): void {
    this.ref.close();
  }
}
