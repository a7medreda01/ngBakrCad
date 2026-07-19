import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses()">
      @if (title()) {
        <div class="mb-4">
          @if (eyebrow()) {
            <p class="text-xs font-bold text-primary uppercase tracking-wider mb-1">{{ eyebrow() }}</p>
          }
          <h3 class="text-lg font-bold text-text-primary">{{ title() }}</h3>
          @if (subtitle()) {
            <p class="text-sm text-text-secondary mt-1">{{ subtitle() }}</p>
          }
        </div>
      }
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent {
  variant = input<'default' | 'interactive' | 'stat' | 'glass'>('default');
  glass = input(false);
  title = input<string | null>(null);
  subtitle = input<string | null>(null);
  eyebrow = input<string | null>(null);
  padding = input<'none' | 'sm' | 'md' | 'lg'>('md');

  cardClasses(): string {
    let base = '';

    switch (this.variant()) {
      case 'interactive':
        base = 'card-interactive';
        break;
      case 'stat':
        base = 'card-stat';
        break;
      case 'glass':
        base = 'card-glass';
        break;
      default:
        base = 'card hover:shadow-card-hover';
    }

    if (this.glass() && this.variant() === 'default') {
      base = 'card-glass';
    }

    switch (this.padding()) {
      case 'none':
        base += ' !p-0';
        break;
      case 'sm':
        base += ' !p-4';
        break;
      case 'lg':
        base += ' !p-8';
        break;
      default:
        break;
    }

    return base;
  }
}
