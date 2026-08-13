import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { WalletService } from '../../../core/services/wallet.service';
import { TranslationService } from '../../../core/services/translation.service';
import { UserProfileDto } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

import { RouterModule, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly walletService = inject(WalletService);
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal(false);
  readonly users = signal<any[]>([]);
  readonly searchTerm = signal('');
  readonly searchInput = signal('');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(50);
  readonly totalCount = signal(0);
  readonly activeTab = signal<'all' | 'designerRequests'>('all');
  readonly designerRequests = signal<any[]>([]);
  readonly isActionLoading = signal<string | null>(null);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly startItem = computed(() => this.totalCount() === 0 ? 0 : (this.pageNumber() - 1) * this.pageSize() + 1);
  readonly endItem = computed(() => Math.min(this.pageNumber() * this.pageSize(), this.totalCount()));

  // Selected User for wallet adjustment or credit update
  readonly selectedUser = signal<any | null>(null);
  readonly adjustAmount = signal(0);
  readonly adjustNotes = signal('');
  readonly creditLimit = signal(0);
  readonly negativeAllowed = signal(false);

  // Modals state
  readonly showAdjustModal = signal(false);
  readonly showCreditModal = signal(false);
  readonly showUserDetailsModal = signal(false);
  readonly showRejectModal = signal(false);
  readonly rejectTargetUser = signal<any | null>(null);
  readonly rejectReason = signal('');

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParams['tab'];
    if (initialTab === 'designerRequests') {
      this.setTab('designerRequests');
    } else {
      this.loadUsers();
      this.loadDesignerRequests();
    }
  }

  setTab(tab: 'all' | 'designerRequests'): void {
    this.activeTab.set(tab);
    if (tab === 'designerRequests') {
      this.loadDesignerRequests();
    } else {
      this.loadUsers();
    }
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.adminService.getUsers(this.pageNumber(), this.pageSize(), this.searchTerm()).subscribe({
      next: (res: any) => {
        this.users.set(res?.items || res?.data || res || []);
        this.totalCount.set(res?.totalCount || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('فشل تحميل المستخدمين');
        this.isLoading.set(false);
      }
    });
  }

  loadDesignerRequests(): void {
    this.adminService.getDesignerRequests(1, 50).subscribe({
      next: (res: any) => {
        this.designerRequests.set(res?.items || res?.data || res || []);
      },
      error: () => {}
    });
  }

  private resolveDesignerRequestId(user: any): string | null {
    if (!user) return null;

    const candidates = [
      user.publicId,
      user.publicID,
      user.id,
      user.userId,
      user.user?.id,
      user.user?.publicId,
      user.user?.publicID,
      user.requestId,
      user.request?.id,
      user.request?.publicId,
      user.request?.publicID
    ];

    return candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0) || null;
  }

  approveDesigner(userOrId: string | any): void {
    const userId = typeof userOrId === 'string' ? userOrId : this.resolveDesignerRequestId(userOrId);
    if (!userId) {
      this.toast.error('تعذر تحديد معرف طلب المصمم');
      return;
    }

    this.isActionLoading.set(userId);
    this.adminService.approveDesigner(userId).subscribe({
      next: () => {
        this.isActionLoading.set(null);
        this.toast.success('تمت الموافقة على طلب المصمم بنجاح!');
        this.loadDesignerRequests();
        this.loadUsers();
      },
      error: (err: any) => {
        this.isActionLoading.set(null);
        this.toast.error(err?.error?.message || 'فشل قبول طلب المصمم');
      }
    });
  }

  rejectDesigner(user: any): void {
    this.rejectTargetUser.set(user);
    this.rejectReason.set('');
    this.showRejectModal.set(true);
  }

  getDesignerRequestId(user: any): string | null {
    return this.resolveDesignerRequestId(user);
  }

  getRejectTargetId(): string | null {
    return this.resolveDesignerRequestId(this.rejectTargetUser());
  }

  getDesignerRequestStatusLabel(req: any): string {
    const approvalStatus = req?.designerProfile?.approvalStatus;

    if (approvalStatus === 'Rejected') {
      return 'مرفوض — بانتظار تعديل المصمم';
    }

    if (approvalStatus === 'Approved') {
      return 'موافق عليه';
    }

    return 'قيد المراجعة';
  }

  confirmReject(): void {
    const user = this.rejectTargetUser();
    if (!user) return;

    const userId = this.resolveDesignerRequestId(user);
    if (!userId) {
      this.toast.error('تعذر تحديد معرف طلب المصمم');
      return;
    }

    const reason = this.rejectReason().trim();
    this.isActionLoading.set(userId);
    this.adminService.rejectDesigner(userId, reason || undefined).subscribe({
      next: () => {
        this.isActionLoading.set(null);
        this.showRejectModal.set(false);
        this.rejectTargetUser.set(null);
        this.toast.success('تم رفض طلب الانضمام.');
        this.loadDesignerRequests();
        this.loadUsers();
      },
      error: (err: any) => {
        this.isActionLoading.set(null);
        this.toast.error(err?.error?.message || 'فشل رفض الطلب');
      }
    });
  }

  cancelReject(): void {
    this.showRejectModal.set(false);
    this.rejectTargetUser.set(null);
  }

  // يُستدعى من كل ضغطة حرف مع Debounce عشان مانديش request لكل حرف
  onSearchInput(value: string): void {
    this.searchInput.set(value);
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.onSearch(value);
    }, 400);
  }

  onSearch(search: string): void {
    this.searchTerm.set(search.trim());
    this.pageNumber.set(1);
    this.loadUsers();
  }

  clearSearch(): void {
    this.searchInput.set('');
    this.onSearch('');
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    this.loadUsers();
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update(p => p + 1);
      this.loadUsers();
    }
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update(p => p - 1);
      this.loadUsers();
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(Number(size));
    this.pageNumber.set(1);
    this.loadUsers();
  }

  // يبني مصفوفة أرقام الصفحات للعرض (مع اختصار ... لو الصفحات كتير)
  getPageNumbers(): (number | string)[] {
    const total = this.totalPages();
    const current = this.pageNumber();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  toggleActive(user: any): void {
    this.adminService.toggleActive(user.id).subscribe({
      next: (res) => {
        this.toast.success(res.message);
        user.isActive = res.isActive;
      }
    });
  }

  openAdjustModal(user: any): void {
    this.selectedUser.set(user);
    this.adjustAmount.set(0);
    this.adjustNotes.set('');
    this.showAdjustModal.set(true);
  }

  submitAdjustment(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.walletService.adjustBalance(user.id, {
      amount: this.adjustAmount(),
      type: 4, // ManualAdjustment
      notes: this.adjustNotes()
    }).subscribe({
      next: () => {
        this.toast.success('تمت تسوية رصيد المحفظة بنجاح');
        this.showAdjustModal.set(false);
        this.loadUsers();
      }
    });
  }

  openCreditModal(user: any): void {
    this.selectedUser.set(user);
    this.creditLimit.set(user.clientProfile?.creditLimit || 0);
    this.negativeAllowed.set(user.clientProfile?.negativeBalanceAllowed || false);
    this.showCreditModal.set(true);
  }

  submitCreditUpdate(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.walletService.updateCreditLimit(user.id, {
      creditLimit: this.creditLimit(),
      negativeBalanceAllowed: this.negativeAllowed()
    }).subscribe({
      next: () => {
        this.toast.success('تم تحديث الحد الائتماني بنجاح');
        this.showCreditModal.set(false);
        this.loadUsers();
      }
    });
  }
  

  private readonly router = inject(Router);

  openUserDetails(user: any): void {
    if (user?.id) {
      this.router.navigate(['/admin/users', user.id]);
    }
  }

  // --- Level & Rating Update Modal ---
  readonly showLevelModal = signal(false);
  readonly updateLevelForm = signal<{ level: string, rating: number | null }>({ level: 'Bronze', rating: null });

  openLevelModal(user: any): void {
    this.selectedUser.set(user);
    const profile = user.roles?.includes('Designer') || user.roles?.includes('Lab') 
      ? user.designerProfile 
      : user.clientProfile;
      
    this.updateLevelForm.set({
      level: profile?.level || 'Bronze',
      rating: user.roles?.includes('Designer') || user.roles?.includes('Lab') ? (profile?.rating || 5.0) : null
    });
    this.showLevelModal.set(true);
  }

  submitLevelUpdate(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.adminService.adminUpdateProfile(user.id, this.updateLevelForm()).subscribe({
      next: () => {
        this.toast.success('تم تحديث المستوى/التقييم بنجاح');
        this.showLevelModal.set(false);
        this.loadUsers();
      }
    });
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}