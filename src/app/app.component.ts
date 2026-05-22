import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { map } from 'rxjs/operators';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { AuthService } from './core/auth.service';
import { NotificationService } from './core/notification.service';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Drawer, Button, MenubarModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);

  /** Показывать выезжающее меню вместо горизонтальной навигации */
  readonly isMobile = toSignal(
    this.breakpoint.observe('(max-width: 991px)').pipe(map((r) => r.matches)),
    { initialValue: false }
  );

  drawerOpen = false;

  closeDrawer() {
    this.drawerOpen = false;
  }

  logout() {
    this.auth.logout();
    this.notify.clear();
    this.router.navigateByUrl('/login');
  }

  dismissFlash() {
    this.notify.clear();
  }
}
