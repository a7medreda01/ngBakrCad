import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 start-4 z-50 flex flex-col gap-2.5 max-w-sm w-full">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          [class]="toastClasses(toast.type)"
          class="flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-slide-in"
        >
          <!-- Alert Type Icon -->
          <span class="flex-shrink-0 mt-0.5">
            @if (toast.type === 'success') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-green-600">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            } @else if (toast.type === 'error') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-red-600">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
              </svg>
            } @else if (toast.type === 'warning') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-600">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-primary">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.083 1.042l-.041.02a.75.75 0 01-1.083-1.042zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" />
              </svg>
            }
          </span>

          <div class="flex-1 text-sm font-bold text-secondary text-start leading-relaxed">
            {{ toast.message }}
          </div>

          <button
            type="button"
            (click)="toastService.remove(toast.id)"
            class="text-text-secondary hover:text-secondary p-0.5 rounded-lg hover:bg-background transition duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    .animate-slide-in {
      animation: slide-in 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `]
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  toastClasses(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'bg-green-50/90 border-green-200';
      case 'error':
        return 'bg-red-50/90 border-red-200';
      case 'warning':
        return 'bg-amber-50/90 border-amber-200';
      case 'info':
      default:
        return 'bg-blue-50/90 border-blue-200';
    }
  }
}
