import { Component, EventEmitter, Input, Output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DesignerOption {
  id: string;
  fullName: string;
  email: string;
  specialization: string;
  rating: number;
  level: number;
  isAvailable: boolean;
}

@Component({
  selector: 'app-assign-designer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="onBackdropClick($event)">
        <div class="modal-panel" (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="modal-header">
            <div class="flex flex-col gap-0.5">
              <h3 class="text-sm font-black text-secondary flex items-center gap-2">
                <i class="bi bi-person-badge text-primary"></i>
                إسناد مصمم
              </h3>
              <p class="text-[11px] text-text-secondary">
                الطلب: <span class="font-bold">{{ orderCode }}</span>
                @if (currentDesignerName) {
                  <span class="text-orange-600"> — المصمم الحالي: {{ currentDesignerName }}</span>
                }
              </p>
            </div>
            <button class="close-btn" (click)="close()" [disabled]="submitting">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Search -->
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              type="text"
              [ngModel]="search()"
              (ngModelChange)="search.set($event)"
              placeholder="بحث بالاسم أو التخصص..."
              class="search-input"
            />
            @if (search()) {
              <button class="clear-search" (click)="search.set('')">
                <i class="bi bi-x-circle-fill"></i>
              </button>
            }
          </div>

          <!-- Designers list -->
          <div class="designers-list">
            @if (!designers.length) {
              <div class="empty-state">
                <i class="bi bi-person-x text-2xl text-text-secondary"></i>
                <p class="text-xs text-text-secondary mt-2">لا يوجد مصممون متاحون حالياً</p>
              </div>
            } @else if (!filteredDesigners().length) {
              <div class="empty-state">
                <i class="bi bi-search text-2xl text-text-secondary"></i>
                <p class="text-xs text-text-secondary mt-2">لا يوجد نتائج مطابقة للبحث</p>
              </div>
            } @else {
              @for (d of filteredDesigners(); track d.id) {
                <button
                  type="button"
                  class="designer-card"
                  [class.selected]="selectedId() === d.id"
                  (click)="selectedId.set(d.id)"
                >
                  <div class="avatar">
                    {{ initials(d.fullName) }}
                  </div>

                  <div class="flex flex-col gap-1 flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-secondary text-xs truncate">{{ d.fullName }}</span>
                      <span class="level-badge">
                        <i class="bi bi-award-fill"></i> L{{ d.level }}
                      </span>
                    </div>

                    @if (d.specialization) {
                      <span class="text-[11px] text-text-secondary truncate">
                        <i class="bi bi-tools"></i> {{ d.specialization }}
                      </span>
                    }

                    <div class="stars">
                      @for (s of stars(); track $index) {
                        <i class="bi" [class.bi-star-fill]="$index < d.rating" [class.bi-star]="$index >= d.rating"></i>
                      }
                      <span class="text-[10px] text-text-secondary ms-1">({{ d.rating }})</span>
                    </div>
                  </div>

                  <div class="check-icon">
                    @if (selectedId() === d.id) {
                      <i class="bi bi-check-circle-fill text-primary text-lg"></i>
                    } @else {
                      <i class="bi bi-circle text-border text-lg"></i>
                    }
                  </div>
                </button>
              }
            }
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn-cancel" (click)="close()" [disabled]="submitting">
              إلغاء
            </button>
            <button
              class="btn-confirm"
              [disabled]="!selectedId() || submitting || selectedId() === currentDesignerId"
              (click)="confirm()"
            >
              @if (submitting) {
                <i class="bi bi-arrow-repeat spin"></i> جاري الإسناد...
              } @else {
                <i class="bi bi-check2"></i> تأكيد الإسناد
              }
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 16px; backdrop-filter: blur(2px);
    }
    .modal-panel {
      background: #fff; border-radius: 20px; width: 100%; max-width: 420px;
      max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      animation: pop .15s ease-out;
    }
    @keyframes pop { from { transform: scale(.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    .modal-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 18px 20px 14px; border-bottom: 1px solid #eef0f3;
    }
    .close-btn {
      width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
      color: #64748b; background: #f5f6f8; border: none; cursor: pointer; font-size: 13px; transition: .15s;
    }
    .close-btn:hover { background: #ebedf0; color: #1e293b; }
    .close-btn:disabled { opacity: .5; cursor: not-allowed; }

    .search-wrap { position: relative; padding: 14px 20px 8px; }
    .search-icon { position: absolute; right: 32px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 13px; }
    .search-input {
      width: 100%; padding: 9px 34px 9px 12px; border-radius: 12px; border: 1px solid #e5e7eb;
      font-size: 12px; outline: none; transition: .15s;
    }
    .search-input:focus { border-color: var(--color-primary, #4f46e5); }
    .clear-search { position: absolute; left: 30px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #cbd5e1; cursor: pointer; }
    .clear-search:hover { color: #94a3b8; }

    .designers-list { padding: 6px 12px 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; max-height: 340px; }

    .designer-card {
      display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 14px;
      border: 1.5px solid #eef0f3; background: #fff; cursor: pointer; text-align: right; width: 100%;
      transition: .15s;
    }
    .designer-card:hover { border-color: #e2e4ea; background: #fafbfc; }
    .designer-card.selected { border-color: var(--color-primary, #4f46e5); background: #f5f4ff; }

    .avatar {
      width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 800;
    }

    .level-badge {
      font-size: 9px; font-weight: 800; color: #b45309; background: #fef3c7;
      border-radius: 6px; padding: 1px 6px; display: inline-flex; align-items: center; gap: 2px;
    }

    .stars { display: flex; align-items: center; gap: 1px; color: #f59e0b; font-size: 10px; }
    .stars .bi-star { color: #e2e4ea; }

    .check-icon { flex-shrink: 0; }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 36px 0; }

    .modal-footer {
      display: flex; gap: 8px; justify-content: flex-end; padding: 14px 20px;
      border-top: 1px solid #eef0f3;
    }
    .btn-cancel {
      font-size: 12px; font-weight: 700; color: #475569; background: #f5f6f8;
      border: none; border-radius: 10px; padding: 8px 16px; cursor: pointer; transition: .15s;
    }
    .btn-cancel:hover { background: #ebedf0; }
    .btn-confirm {
      font-size: 12px; font-weight: 700; color: #fff; background: var(--color-primary, #4f46e5);
      border: none; border-radius: 10px; padding: 8px 18px; cursor: pointer; transition: .15s;
      display: flex; align-items: center; gap: 6px;
    }
    .btn-confirm:hover:not(:disabled) { filter: brightness(0.92); }
    .btn-confirm:disabled { opacity: .5; cursor: not-allowed; }

    .spin { animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class AssignDesignerModalComponent {
  @Input() open = false;
  @Input() orderCode = '';
  @Input() currentDesignerName: string | null = null;
  @Input() currentDesignerId: string | null = null;
  @Input() designers: DesignerOption[] = [];
  @Input() submitting = false;

  @Output() closed = new EventEmitter<void>();
  @Output() assigned = new EventEmitter<{ designerId: string }>();

  readonly search = signal('');
  readonly selectedId = signal<string | null>(null);

  readonly stars = () => [0, 1, 2, 3, 4];

  readonly filteredDesigners = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.designers;
    return this.designers.filter(d =>
      d.fullName?.toLowerCase().includes(term) ||
      d.specialization?.toLowerCase().includes(term)
    );
  });

  constructor() {
    // Reset internal state whenever the modal is (re)opened
    effect(() => {
      if (this.open) {
        this.search.set('');
        this.selectedId.set(this.currentDesignerId ?? null);
      }
    });
  }

  initials(name: string): string {
    if (!name) return '؟';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }

  onBackdropClick(e: MouseEvent): void {
    if (!this.submitting) this.close();
  }

  close(): void {
    this.closed.emit();
  }

  confirm(): void {
    const id = this.selectedId();
    if (!id) return;
    this.assigned.emit({ designerId: id });
  }
}