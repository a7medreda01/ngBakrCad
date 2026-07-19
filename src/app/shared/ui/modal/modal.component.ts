import { Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/40 backdrop-blur-sm transition-all duration-300">
        <!-- Backdrop close hook -->
        <div class="absolute inset-0" (click)="close()"></div>
        
        <!-- Modal Card Container -->
        <div class="relative bg-surface border border-border w-full max-w-lg rounded-2xl shadow-card overflow-hidden z-10 transition-all duration-300 transform scale-100 flex flex-col max-h-[90vh]">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50">
            <h3 class="text-base font-bold text-secondary">{{ title() }}</h3>
            <button type="button" (click)="close()" class="text-text-secondary hover:text-secondary hover:bg-background p-1.5 rounded-lg transition duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 overflow-y-auto flex-1">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `
})
export class ModalComponent {
  isOpen = model<boolean>(false);
  title = input<string>('');
  
  closed = output<void>();

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }
}
