export interface Release {
  id: number;
  tagName: string;
  name: string | null;
  body: string | null;
  publishedAt: string | null;
  htmlUrl: string;
}

export interface RepoReleaseFeed {
  repoFullName: string;
  repoOwner: string;
  repoName: string;
  releases: Release[];
  hasUnseen: boolean;
}
