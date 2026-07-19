import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || isLoading()"
      [class]="buttonClasses()"
      class="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed"
    >
      @if (isLoading()) {
        <svg class="animate-spin h-4 w-4 text-current shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      }
      <ng-content></ng-content>
    </button>
  `,
  styles: [`:host { display: inline-block; }`]
})
export class ButtonComponent {
  type = input<'button' | 'submit' | 'reset'>('button');
  variant = input<'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'accent'>('primary');
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  fullWidth = input(false);
  isLoading = input(false);
  disabled = input(false);

  buttonClasses(): string {
    let classes = '';

    switch (this.variant()) {
      case 'primary':
        classes += ' bg-primary text-white hover:bg-primary-dark shadow-primary-sm focus:ring-primary/40';
        break;
      case 'secondary':
        classes += ' bg-secondary text-white hover:bg-secondary-light focus:ring-secondary/40';
        break;
      case 'accent':
        classes += ' bg-accent text-secondary hover:bg-accent-light shadow-primary-sm focus:ring-accent/40';
        break;
      case 'outline':
        classes += ' bg-transparent border-2 border-border text-text-primary hover:bg-background-subtle hover:border-primary/30 focus:ring-primary/20';
        break;
      case 'danger':
        classes += ' bg-error text-white hover:bg-error-dark focus:ring-error/40';
        break;
      case 'ghost':
        classes += ' bg-transparent text-text-secondary hover:bg-background-subtle hover:text-text-primary focus:ring-primary/10';
        break;
    }

    switch (this.size()) {
      case 'sm':
        classes += ' px-3.5 py-1.5 text-xs';
        break;
      case 'md':
        classes += ' px-5 py-2.5 text-sm';
        break;
      case 'lg':
        classes += ' px-7 py-3.5 text-base';
        break;
      case 'xl':
        classes += ' px-8 py-4 text-lg';
        break;
    }

    if (this.fullWidth()) {
      classes += ' w-full';
    }

    return classes;
  }
}
