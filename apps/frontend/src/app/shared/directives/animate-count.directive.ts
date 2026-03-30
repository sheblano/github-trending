import {
  Directive,
  ElementRef,
  inject,
  input,
  effect,
  DestroyRef,
  AfterViewInit,
} from '@angular/core';

@Directive({
  selector: '[appAnimateCount]',
  standalone: true,
})
export class AnimateCountDirective implements AfterViewInit {
  appAnimateCount = input.required<number>();
  appAnimateCountFormat = input<((v: number) => string) | undefined>(undefined);
  appAnimateCountDuration = input(800);

  private el = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  private frameId: number | null = null;
  private hasBeenVisible = false;
  private observer: IntersectionObserver | null = null;
  private pendingTarget: number | null = null;

  constructor() {
    AnimateCountDirective.injectStyles();

    effect(() => {
      const target = this.appAnimateCount();
      const fmt = this.appAnimateCountFormat();
      const duration = this.appAnimateCountDuration();

      if (!this.hasBeenVisible) {
        this.pendingTarget = target;
        const el = this.el.nativeElement as HTMLElement;
        el.textContent = fmt ? fmt(0) : '0';
        return;
      }

      this.animate(target, duration, fmt);
    });
  }

  ngAfterViewInit() {
    const host = this.el.nativeElement as HTMLElement;

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !this.hasBeenVisible) {
          this.hasBeenVisible = true;
          this.observer?.disconnect();
          this.observer = null;

          if (this.pendingTarget != null) {
            const target = this.pendingTarget;
            this.pendingTarget = null;
            this.animate(
              target,
              this.appAnimateCountDuration(),
              this.appAnimateCountFormat()
            );
          }
        }
      },
      { rootMargin: '50px', threshold: 0.01 }
    );

    this.observer.observe(host);

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      if (this.frameId != null) {
        cancelAnimationFrame(this.frameId);
      }
    });
  }

  private animate(
    target: number,
    duration: number,
    fmt?: (v: number) => string
  ) {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    const el = this.el.nativeElement as HTMLElement;

    if (duration <= 0 || target === 0) {
      el.textContent = fmt ? fmt(target) : String(target);
      return;
    }

    el.classList.add('ac-counting');
    el.classList.remove('ac-done');

    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = fmt ? fmt(current) : String(current);

      if (progress < 1) {
        this.frameId = requestAnimationFrame(step);
      } else {
        this.frameId = null;
        el.classList.remove('ac-counting');
        el.classList.add('ac-done');
        setTimeout(() => el.classList.remove('ac-done'), 500);
      }
    };

    this.frameId = requestAnimationFrame(step);
  }

  private static stylesInjected = false;
  private static injectStyles() {
    if (AnimateCountDirective.stylesInjected) return;
    AnimateCountDirective.stylesInjected = true;

    const style = document.createElement('style');
    style.id = 'ac-styles';
    style.textContent = `
      .ac-counting {
        color: var(--mat-sys-primary, #1976d2) !important;
        transition: color 0.2s ease;
      }
      .ac-done {
        animation: ac-pop 0.4s cubic-bezier(0.22, 1, 0.36, 1);
      }
      @keyframes ac-pop {
        0%   { transform: scale(1); filter: brightness(1); }
        35%  { transform: scale(1.15); filter: brightness(1.3); }
        100% { transform: scale(1); filter: brightness(1); }
      }
    `;
    document.head.appendChild(style);
  }
}
