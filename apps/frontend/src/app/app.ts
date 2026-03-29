import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from './store/auth.store';
import { ThemeStore } from './store/theme.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App implements OnInit {
  private authStore = inject(AuthStore);
  /** Eager inject applies ThemeStore effect (document class + localStorage). */
  private _theme = inject(ThemeStore);

  ngOnInit() {
    this.authStore.loadUser();
  }
}
