import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TimelineEvent {
  title: string;
  description?: string;
  date?: string;
  isCompleted: boolean;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative pl-6 sm:pl-8 border-l border-border/80 mr-4 py-2 flex flex-col gap-6">
      @for (event of events(); track $index) {
        <div class="relative">
          <!-- Bullet Node -->
          <span
            [class.bg-primary]="event.isCompleted"
            [class.border-primary]="event.isCompleted"
            [class.bg-white]="!event.isCompleted"
            [class.border-border]="!event.isCompleted"
            class="absolute -left-[37px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300"
          >
            @if (event.isCompleted) {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-3 h-3 text-white">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            }
          </span>

          <!-- Content Card -->
          <div class="flex flex-col gap-1">
            <h4 [class.text-secondary]="event.isCompleted" [class.text-text-secondary]="!event.isCompleted" class="text-sm font-bold transition-all duration-300">
              {{ event.title }}
            </h4>
            @if (event.description) {
              <p class="text-xs text-text-secondary">{{ event.description }}</p>
            }
            @if (event.date) {
              <span class="text-[10px] text-text-secondary/70 font-semibold">{{ event.date }}</span>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class TimelineComponent {
  events = input<TimelineEvent[]>([]);
}
