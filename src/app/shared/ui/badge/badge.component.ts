import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses()" class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border">
      @if (dot()) {
        <span class="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
      }
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  type = input<'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral'>('info');
  dot = input(false);

  badgeClasses(): string {
    switch (this.type()) {
      case 'success':
        return 'bg-success-light border-success/20 text-success-dark';
      case 'warning':
        return 'bg-warning-light border-warning/20 text-warning-dark';
      case 'danger':
        return 'bg-error-light border-error/20 text-error-dark';
      case 'primary':
        return 'bg-primary-50 border-primary-200 text-primary-700';
      case 'neutral':
        return 'bg-background-subtle border-border text-text-secondary';
      case 'info':
      default:
        return 'bg-info-light border-info/20 text-info-dark';
    }
  }
}
