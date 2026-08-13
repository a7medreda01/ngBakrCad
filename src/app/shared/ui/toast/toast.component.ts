import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 start-4 z-50 flex flex-col gap-3 max-w-sm w-full">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast-glass relative flex items-start gap-3 pe-3 ps-4 py-3.5 rounded-2xl overflow-hidden animate-slide-in"
        >
          <!-- Status accent bar (side color only) -->
          <span
            class="absolute inset-y-0 start-0 w-1 rounded-s-2xl"
            [class]="accentClasses(toast.type)"
          ></span>

          <!-- Alert Type Icon (colored, only element carrying status color) -->
          <span
            class="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center"
            [class]="iconWrapClasses(toast.type)"
          >
            @if (toast.type === 'success') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            } @else if (toast.type === 'error') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
              </svg>
            } @else if (toast.type === 'warning') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.083 1.042l-.041.02a.75.75 0 01-1.083-1.042zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" />
              </svg>
            }
          </span>

          <div class="flex-1 text-sm font-semibold leading-relaxed toast-text pt-0.5">
            {{ toast.message }}
          </div>

          <button
            type="button"
            (click)="toastService.remove(toast.id)"
            class="toast-close-btn flex-shrink-0 p-1 rounded-md transition duration-200"
            aria-label="Close notification"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="w-4 h-4">
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
        transform: translateY(-14px) scale(0.98);
        opacity: 0;
      }
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
    .animate-slide-in {
      animation: slide-in 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }

    /* iOS-style glass card: white/transparent surface using the app's own design tokens */
    .toast-glass {
      background: color-mix(in srgb, var(--color-surface) 70%, transparent);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      backdrop-filter: saturate(180%) blur(20px);
      border: 1px solid color-mix(in srgb, white 40%, var(--color-border));
      box-shadow:
        var(--shadow-card),
        inset 0 1px 0 color-mix(in srgb, white 60%, transparent);
    }

    @media (prefers-color-scheme: dark) {
      .toast-glass {
        background: color-mix(in srgb, var(--color-primary-dark) 55%, transparent);
        border: 1px solid color-mix(in srgb, var(--color-primary-light) 25%, transparent);
        box-shadow:
          0 8px 24px rgba(0, 0, 0, 0.35),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }
      .toast-text {
        color: rgba(255, 255, 255, 0.95);
      }
      .toast-close-btn {
        color: rgba(255, 255, 255, 0.6);
      }
      .toast-close-btn:hover {
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .toast-text {
      color: #1A1A2E;
    }

    .toast-close-btn {
      color: var(--color-primary-dark);
      opacity: 0.5;
    }
    .toast-close-btn:hover {
      opacity: 1;
      background: color-mix(in srgb, var(--color-primary-light) 15%, transparent);
    }

    .toast-close-btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
    }

    @media (prefers-reduced-motion: reduce) {
      .animate-slide-in {
        animation: none;
      }
    }
  `]
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  /** Side accent bar carries the status color, using the app's design tokens */
  accentClasses(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'bg-success';
      case 'error':
        return 'bg-error';
      case 'warning':
        return 'bg-warning';
      case 'info':
      default:
        return 'bg-primary';
    }
  }

  /** Icon circle carries the status color (tinted, not solid fill), using the app's design tokens */
  iconWrapClasses(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'bg-success-light text-success-dark';
      case 'error':
        return 'bg-error-light text-error-dark';
      case 'warning':
        return 'bg-warning-light text-warning-dark';
      case 'info':
      default:
        return 'bg-primary-50 text-primary-700';
    }
  }
}