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
  profilePictureUrl?: string | null;
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
              (ngModelChange)="onSearchChange($event)"
              placeholder="بحث بالاسم أو التخصص..."
              class="search-input"
            />
            @if (search()) {
              <button class="clear-search" (click)="onSearchChange('')">
                <i class="bi bi-x-circle-fill"></i>
              </button>
            }
          </div>

          <!-- Legend -->
          <div class="legend">
            <span class="legend-item"><span class="dot dot-available"></span> متاح</span>
            <span class="legend-item"><span class="dot dot-unavailable"></span> غير متاح</span>
            <span class="legend-count">{{ filteredDesigners().length }} مصمم</span>
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
              <div class="designers-grid">
                @for (d of pagedDesigners(); track d.id) {
                  <button
                    type="button"
                    class="designer-card"
                    [class.selected]="selectedId() === d.id"
                    [class.disabled-card]="!d.isAvailable"
                    (click)="selectedId.set(d.id)"
                  >
                    <div class="avatar-wrap">
                      @if (d.profilePictureUrl && !brokenImageIds().has(d.id)) {
                        <img
                          class="avatar-img"
                          [src]="d.profilePictureUrl"
                          [alt]="d.fullName"
                          (error)="onImgError(d.id)"
                        />
                      } @else {
                        <div class="avatar">
                          {{ initials(d.fullName) }}
                        </div>
                      }
                      <span
                        class="status-dot"
                        [class.dot-available]="d.isAvailable"
                        [class.dot-unavailable]="!d.isAvailable"
                        [title]="d.isAvailable ? 'متاح' : 'غير متاح'"
                      ></span>
                    </div>

                    <div class="card-body">
                      <div class="card-top-row">
                        <span class="font-bold text-secondary text-xs truncate">{{ d.fullName }}</span>
                        <span class="level-badge">
                          <i class="bi bi-award-fill"></i> L{{ d.level }}
                        </span>
                        <span class="avail-badge" [class.avail-yes]="d.isAvailable" [class.avail-no]="!d.isAvailable">
                          <span class="dot" [class.dot-available]="d.isAvailable" [class.dot-unavailable]="!d.isAvailable"></span>
                          {{ d.isAvailable ? 'متاح' : 'غير متاح' }}
                        </span>
                      </div>

                      @if (d.specialization) {
                        <span class="specialization-text">
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
              </div>

              <!-- Pagination -->
              @if (totalPages() > 1) {
                <div class="pagination">
                  <button
                    class="page-btn"
                    [disabled]="currentPage() === 1"
                    (click)="goToPage(currentPage() - 1)"
                  >
                    <i class="bi bi-chevron-right"></i>
                  </button>

                  <div class="page-numbers">
                    @for (p of pageList(); track p) {
                      @if (p === -1) {
                        <span class="page-ellipsis">…</span>
                      } @else {
                        <button
                          class="page-num"
                          [class.active]="p === currentPage()"
                          (click)="goToPage(p)"
                        >
                          {{ p }}
                        </button>
                      }
                    }
                  </div>

                  <button
                    class="page-btn"
                    [disabled]="currentPage() === totalPages()"
                    (click)="goToPage(currentPage() + 1)"
                  >
                    <i class="bi bi-chevron-left"></i>
                  </button>
                </div>
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
      background: #fff; border-radius: 20px; width: 100%; max-width: 680px;
      max-height: 88vh; display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      animation: pop .15s ease-out;
    }
    @keyframes pop { from { transform: scale(.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    @media (max-width: 480px) {
      .modal-backdrop { padding: 0; align-items: flex-end; }
      .modal-panel { max-width: 100%; max-height: 92vh; border-radius: 18px 18px 0 0; }
    }

    .modal-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 18px 24px 14px; border-bottom: 1px solid #eef0f3;
    }
    .close-btn {
      width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
      color: #64748b; background: #f5f6f8; border: none; cursor: pointer; font-size: 13px; transition: .15s;
    }
    .close-btn:hover { background: #ebedf0; color: #1e293b; }
    .close-btn:disabled { opacity: .5; cursor: not-allowed; }

    .search-wrap { position: relative; padding: 14px 24px 8px; }
    .search-icon { position: absolute; right: 36px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 13px; }
    .search-input {
      width: 100%; padding: 9px 34px 9px 12px; border-radius: 12px; border: 1px solid #e5e7eb;
      font-size: 12px; outline: none; transition: .15s;
    }
    .search-input:focus { border-color: var(--color-primary, #4f46e5); }
    .clear-search { position: absolute; left: 34px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #cbd5e1; cursor: pointer; }
    .clear-search:hover { color: #94a3b8; }

    .legend {
      display: flex; align-items: center; gap: 14px; padding: 4px 24px 8px;
      font-size: 10.5px; color: #64748b; flex-wrap: wrap;
    }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-count { margin-inline-start: auto; font-weight: 700; color: #94a3b8; }

    .designers-list { padding: 6px 16px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; max-height: 420px; }

    .designers-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    @media (max-width: 640px) {
      .designers-grid { grid-template-columns: 1fr; }
    }

    .designer-card {
      display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-radius: 14px;
      border: 1.5px solid #eef0f3; background: #fff; cursor: pointer; text-align: right; width: 100%;
      min-width: 0;
      transition: .15s;
    }
    .designer-card:hover { border-color: #e2e4ea; background: #fafbfc; }
    .designer-card.selected { border-color: var(--color-primary, #4f46e5); background: #f5f4ff; }
    .designer-card.disabled-card { opacity: .72; }

    .avatar-wrap { position: relative; flex-shrink: 0; margin-top: 1px; }
    .avatar, .avatar-img {
      width: 38px; height: 38px; border-radius: 50%;
    }
    .avatar {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 800;
    }
    .avatar-img {
      object-fit: cover; display: block; border: 1px solid #eef0f3; background: #f5f6f8;
    }
    .status-dot {
      position: absolute; bottom: -1px; left: -1px;
      width: 11px; height: 11px; border-radius: 50%;
      border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.04);
    }

    .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .dot-available { background: #22c55e; }
    .dot-unavailable { background: #94a3b8; }
    .status-dot.dot-available { background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.18); }
    .status-dot.dot-unavailable { background: #94a3b8; }

    .card-body {
      display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0;
    }

    .card-top-row {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    }
    .card-top-row > span:first-child { flex-shrink: 1; min-width: 0; }

    .avail-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 9.5px; font-weight: 700; border-radius: 999px; padding: 2px 7px; white-space: nowrap;
      margin-inline-start: auto;
    }
    .avail-yes { color: #15803d; background: #eafcef; }
    .avail-no { color: #64748b; background: #f1f2f5; }

    .level-badge {
      font-size: 9px; font-weight: 800; color: #b45309; background: #fef3c7;
      border-radius: 6px; padding: 1px 6px; display: inline-flex; align-items: center; gap: 2px;
      flex-shrink: 0;
    }

    .specialization-text {
      font-size: 11px; color: #64748b; line-height: 1.45;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden; word-break: break-word;
    }

    .stars { display: flex; align-items: center; gap: 1px; color: #f59e0b; font-size: 10px; }
    .stars .bi-star { color: #e2e4ea; }

    .check-icon { flex-shrink: 0; align-self: center; }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 36px 0; }

    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 6px; padding-top: 12px;
    }
    .page-btn, .page-num {
      width: 28px; height: 28px; border-radius: 8px; border: 1px solid #eef0f3; background: #fff;
      font-size: 11px; font-weight: 700; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: .15s;
    }
    .page-btn:hover:not(:disabled), .page-num:hover:not(.active) { background: #f5f6f8; }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .page-num.active { background: var(--color-primary, #4f46e5); border-color: var(--color-primary, #4f46e5); color: #fff; }
    .page-ellipsis { width: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
    .page-numbers { display: flex; align-items: center; gap: 4px; }

    .modal-footer {
      display: flex; gap: 8px; justify-content: flex-end; padding: 14px 24px;
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
  @Input() pageSize = 6;

  @Output() closed = new EventEmitter<void>();
  @Output() assigned = new EventEmitter<{ designerId: string }>();

  readonly search = signal('');
  readonly selectedId = signal<string | null>(null);
  readonly currentPage = signal(1);
  readonly brokenImageIds = signal<Set<string>>(new Set());

  readonly stars = () => [0, 1, 2, 3, 4];

  readonly filteredDesigners = computed(() => {
    const term = this.search().trim().toLowerCase();
    const list = !term
      ? this.designers
      : this.designers.filter(d =>
          d.fullName?.toLowerCase().includes(term) ||
          d.specialization?.toLowerCase().includes(term)
        );
    // Available designers first, then by rating
    return [...list].sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredDesigners().length / this.pageSize))
  );

  readonly pagedDesigners = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredDesigners().slice(start, start + this.pageSize);
  });

  // Compact page list with ellipses, e.g. 1 … 4 5 6 … 12
  readonly pageList = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const push = (n: number) => { if (!pages.includes(n)) pages.push(n); };

    push(1);
    for (let p = current - 1; p <= current + 1; p++) {
      if (p > 1 && p < total) push(p);
    }
    push(total);

    const result: number[] = [];
    let prev = 0;
    for (const p of pages.sort((a, b) => a - b)) {
      if (prev && p - prev > 1) result.push(-1); // ellipsis marker
      result.push(p);
      prev = p;
    }
    return result;
  });

  constructor() {
    // Reset internal state whenever the modal is (re)opened
    effect(() => {
      if (this.open) {
        this.search.set('');
        this.currentPage.set(1);
        this.selectedId.set(this.currentDesignerId ?? null);
      }
    });
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    const total = this.totalPages();
    if (page < 1 || page > total) return;
    this.currentPage.set(page);
  }

  onImgError(designerId: string): void {
    const next = new Set(this.brokenImageIds());
    next.add(designerId);
    this.brokenImageIds.set(next);
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