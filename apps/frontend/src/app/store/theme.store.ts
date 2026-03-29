import { Injectable, signal, effect } from '@angular/core';

const STORAGE_KEY = 'github-trending-theme';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  readonly mode = signal<'light' | 'dark'>(this.readInitial());

  constructor() {
    effect(() => {
      const m = this.mode();
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.classList.toggle('theme-dark', m === 'dark');
        root.classList.toggle('theme-light', m === 'light');
        root.setAttribute('data-theme', m);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
          meta.setAttribute('content', m === 'dark' ? '#1a1a2e' : '#f3e8ff');
        }
      }
      try {
        localStorage.setItem(STORAGE_KEY, m);
      } catch {
        /* ignore */
      }
    });
  }

  private readInitial(): 'light' | 'dark' {
    if (typeof localStorage === 'undefined') return 'light';
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
    return 'light';
  }

  toggle(): void {
    this.mode.update((m) => (m === 'dark' ? 'light' : 'dark'));
  }

  setDark(): void {
    this.mode.set('dark');
  }

  setLight(): void {
    this.mode.set('light');
  }
}
