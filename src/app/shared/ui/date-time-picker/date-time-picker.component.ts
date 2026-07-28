import {
  Component, Input, Output, EventEmitter, OnInit,
  signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DateTimeConfirmEvent {
  dateStr: string;   // datetime-local compatible string: YYYY-MM-DDTHH:mm
  withExpress: boolean;
}

@Component({
  selector: 'app-date-time-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-time-picker.component.html'
})
export class DateTimePickerComponent implements OnInit {
  /** Earliest datetime that does NOT require express shipping.
   *  Derived from maximum minimumDeliveryHours among selected services. */
  @Input() minDate: Date | null = null;
  /** Pre-fill from an existing datetime-local string */
  @Input() initialValue = '';

  @Output() confirmed = new EventEmitter<DateTimeConfirmEvent>();
  @Output() dismissed  = new EventEmitter<void>();

  // ── Calendar state ────────────────────────────────────────────────
  readonly viewYear  = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());
  readonly selDay    = signal<{ y: number; m: number; d: number } | null>(null);
  readonly selHour   = signal(9);
  readonly selMinute = signal(0);

  readonly showExpressPrompt = signal(false);

  // ── Computed ──────────────────────────────────────────────────────
  readonly calendarCells = computed<Array<number | null>>(() => {
    const y = this.viewYear(), m = this.viewMonth();
    const firstDow    = new Date(y, m, 1).getDay();     // 0 = Sunday
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDow; i++)      cells.push(null);
    for (let d = 1; d <= daysInMonth; d++)  cells.push(d);
    return cells;
  });

  readonly monthLabel = computed(() => {
    const names = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return `${names[this.viewMonth()]} ${this.viewYear()}`;
  });

  readonly selectedDatetime = computed((): Date | null => {
    const s = this.selDay();
    if (!s) return null;
    return new Date(s.y, s.m, s.d, this.selHour(), this.selMinute());
  });

  readonly isBeforeMin = computed((): boolean => {
    const dt = this.selectedDatetime();
    return !!dt && !!this.minDate && dt.getTime() < this.minDate.getTime();
  });

  readonly formattedSelected = computed((): string => {
    const dt = this.selectedDatetime();
    if (!dt) return '';
    return dt.toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' });
  });

  readonly formattedMin = computed((): string => {
    if (!this.minDate) return '';
    return this.minDate.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  });

  // ── Lifecycle ─────────────────────────────────────────────────────
  ngOnInit(): void {
    if (this.initialValue) {
      const d = new Date(this.initialValue);
      if (!isNaN(d.getTime())) {
        this.viewYear.set(d.getFullYear());
        this.viewMonth.set(d.getMonth());
        this.selDay.set({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() });
        this.selHour.set(d.getHours());
        this.selMinute.set(Math.round(d.getMinutes() / 15) * 15 % 60);
      }
    }
  }

  // ── Calendar navigation ───────────────────────────────────────────
  prevMonth(): void {
    if (this.viewMonth() === 0) { this.viewMonth.set(11); this.viewYear.update(y => y - 1); }
    else { this.viewMonth.update(v => v - 1); }
  }

  nextMonth(): void {
    if (this.viewMonth() === 11) { this.viewMonth.set(0); this.viewYear.update(y => y + 1); }
    else { this.viewMonth.update(v => v + 1); }
  }

  // ── Day helpers ───────────────────────────────────────────────────
  selectDay(day: number): void {
    if (this.isDayDisabled(day)) return;
    this.selDay.set({ y: this.viewYear(), m: this.viewMonth(), d: day });
    this.showExpressPrompt.set(false);
  }

  isDayDisabled(day: number): boolean {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(this.viewYear(), this.viewMonth(), day) < today;
  }

  isSelected(day: number): boolean {
    const s = this.selDay();
    return !!s && s.y === this.viewYear() && s.m === this.viewMonth() && s.d === day;
  }

  isToday(day: number): boolean {
    const t = new Date();
    return t.getFullYear() === this.viewYear()
        && t.getMonth()    === this.viewMonth()
        && t.getDate()     === day;
  }

  // ── Hour helpers ──────────────────────────────────────────────────
  isHourDisabled(h: number): boolean {
    const s = this.selDay();
    if (!s) return false;
    const now     = new Date();
    const selDate = new Date(s.y, s.m, s.d);
    const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (selDate > today) return false;          // future date ─ all hours ok
    return h <= now.getHours();                 // same day ─ block past + current hour
  }

  adjustHour(delta: number): void {
    let h = (this.selHour() + delta + 24) % 24;
    let tries = 0;
    while (this.isHourDisabled(h) && tries++ < 24) h = (h + delta + 24) % 24;
    this.selHour.set(h);
  }

  // ── Minute helpers (15-min steps) ─────────────────────────────────
  private readonly STEPS = [0, 15, 30, 45];

  adjustMinute(delta: number): void {
    const idx = this.STEPS.indexOf(this.selMinute());
    const base = idx < 0 ? 0 : idx;
    this.selMinute.set(this.STEPS[((base + delta) + 4) % 4]);
  }

  // ── AM / PM ───────────────────────────────────────────────────────
  setAm(): void { if (this.selHour() >= 12) this.adjustHour(-12); }
  setPm(): void { if (this.selHour() <  12) this.adjustHour(+12); }

  // ── Confirm flow ──────────────────────────────────────────────────
  tryConfirm(): void {
    if (!this.selDay()) return;
    if (this.isBeforeMin()) { this.showExpressPrompt.set(true); return; }
    this.emit(false);
  }

  confirmWithExpress(): void { this.emit(true);  this.showExpressPrompt.set(false); }
  cancelExpress():       void { this.showExpressPrompt.set(false); }
  dismiss():             void { this.dismissed.emit(); }

  private emit(withExpress: boolean): void {
    const s   = this.selDay()!;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const str = `${s.y}-${pad(s.m + 1)}-${pad(s.d)}T${pad(this.selHour())}:${pad(this.selMinute())}`;
    this.confirmed.emit({ dateStr: str, withExpress });
  }
}
