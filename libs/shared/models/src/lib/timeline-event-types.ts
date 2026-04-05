export const TIMELINE_EVENT_TYPES = {
  STAR_SPIKE: 'star_spike',
  ENTERED_RADAR: 'entered_radar',
  RELEASE_PUBLISHED: 'release_published',
} as const;

export type TimelineEventType =
  (typeof TIMELINE_EVENT_TYPES)[keyof typeof TIMELINE_EVENT_TYPES];
