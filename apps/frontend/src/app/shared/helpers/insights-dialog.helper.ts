import { MatDialog } from '@angular/material/dialog';
import { RepoInsightsDialogComponent } from '../components/repo-insights-dialog.component';
import { type RepoInsightsPanelData } from '../components/repo-insights-panel.component';
import { ReadmeDrawerComponent } from '../components/readme-drawer.component';
import type { GitHubRepo } from '@github-trending/shared/models';

export function openInsightsDialog(
  dialog: MatDialog,
  insight: RepoInsightsPanelData,
  readmeDrawer: ReadmeDrawerComponent | undefined
): void {
  dialog.open(RepoInsightsDialogComponent, {
    width: 'min(520px, 92vw)',
    maxWidth: '95vw',
    autoFocus: 'first-tabbable',
    data: {
      insight,
      onReadme: () => {
        if (readmeDrawer) {
          openReadmeFromPanelData(readmeDrawer, insight);
        }
      },
    },
  });
}

export function openReadmeFromPanelData(
  drawer: ReadmeDrawerComponent,
  s: RepoInsightsPanelData
): void {
  const [owner = '', name = ''] = s.fullName.split('/');
  drawer.openRepo(stubRepoFromInsight(s, owner, name));
}

function stubRepoFromInsight(
  s: RepoInsightsPanelData,
  owner: string,
  name: string
): GitHubRepo {
  return {
    id: Date.now(),
    name,
    full_name: s.fullName,
    owner: { login: owner, avatar_url: '' },
    html_url: s.htmlUrl,
    description: s.description ?? null,
    language: s.language ?? null,
    stargazers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
    pushed_at: new Date().toISOString(),
    created_at: '',
    updated_at: '',
    topics: [],
    license: null,
    archived: false,
    watchScore: s.watchScore,
    radarScore: s.radarScore,
    watchReasons: s.reasons,
    radarReasons: s.reasons,
  } as GitHubRepo;
}
