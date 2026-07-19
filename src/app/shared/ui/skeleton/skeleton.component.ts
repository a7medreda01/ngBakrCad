import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="variantClasses()"
      class="animate-pulse bg-slate-200 rounded-xl"
    ></div>
  `
})
export class SkeletonComponent {
  height = input<string>('16px');
  width = input<string>('100%');
  shape = input<'line' | 'avatar' | 'card'>('line');

  variantClasses(): string {
    let classes = '';
    
    if (this.shape() === 'avatar') {
      classes += ' rounded-full w-10 h-10';
    } else if (this.shape() === 'card') {
      classes += ' h-32 w-full';
    } else {
      classes += ` h-[${this.height()}] w-[${this.width()}]`;
    }

    return classes;
  }
}
