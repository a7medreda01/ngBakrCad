import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/ui/toast/toast.component';
import { NotificationToastComponent } from './shared/ui/notification-toast/notification-toast.component';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, NotificationToastComponent],
  templateUrl: './app.html',
  styles: []
})
export class App {
  readonly loadingService = inject(LoadingService);
}
