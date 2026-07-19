import { Component, OnInit, signal, computed, inject } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { OrderService } from '../../../core/services/order.service';

import { AdminService } from '../../../core/services/admin.service';

import { TranslationService } from '../../../core/services/translation.service';

import { ToastService } from '../../../core/services/toast.service';

import { OrderStatus } from '../../../core/enums';

import { OrderDto, StatusAction, STATUS_META, getStatusActions, STUCK_STATUSES, PAUSED_STATUSES, statusLabel, OrderStatusHistoryDto } from '../../../core/models';


import { AssignDesignerModalComponent, DesignerOption } from '../orders/app-assign-designer';
import { OdontogramComponent } from '../../../shared/components/odontogram/odontogram.component';



@Component({

  selector: 'app-admin-order-detail',

  standalone: true,

  imports: [CommonModule, FormsModule, AssignDesignerModalComponent, OdontogramComponent],

  templateUrl: './admin-order-detail.html',

//   styleUrl: './admin-order-detail.component.scss'

})

export class AdminOrderDetailComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly orderService = inject(OrderService);

  private readonly adminService = inject(AdminService);

  readonly i18n = inject(TranslationService);

  private readonly toast = inject(ToastService);



  private readonly orderId = this.route.snapshot.paramMap.get('id') ?? '';



  readonly order = signal<OrderDto | null>(null);
  readonly activeFilesTab = signal<'client' | 'designer'>('client');

  readonly isLoading = signal(true);

  readonly activeTab = signal<'summary' | 'files' | 'history' | 'actions'>('summary');



  readonly history = signal<OrderStatusHistoryDto[]>([]);

  readonly isLoadingHistory = signal(false);



  readonly designers = signal<DesignerOption[]>([]);

  readonly showAssignModal = signal(false);

  readonly isAssigning = signal(false);



  readonly pendingAction = signal<StatusAction | null>(null);

  readonly actionNotes = signal('');

  readonly sendPreview = signal(false);

  readonly isSubmittingAction = signal(false);



  readonly showRedoPanel = signal(false);

  readonly redoIsPaid = signal(false);

  readonly redoAmount = signal(0);

  readonly redoNotes = signal('');

  readonly isSubmittingRedo = signal(false);

  readonly isProcessing = signal(false);
  readonly quotationPrice = signal<number>(0);
  readonly isSettingQuotationPrice = signal<boolean>(false);

  readonly OrderStatus = OrderStatus;

  readonly STATUS_META = STATUS_META;



  readonly availableActions = computed(() => {

    const o = this.order();

    return o ? getStatusActions(o.status) : [];

  });

  readonly clientOrderFiles = computed(() => {
    const files = this.order()?.files ?? [];
    return files.filter(file => ['input', 'cbct'].includes((file.category || '').toLowerCase()));
  });

  readonly clientResponseFiles = computed(() => {
    const files = this.order()?.files ?? [];
    return files.filter(file => ['client_response'].includes((file.category || '').toLowerCase()));
  });

  readonly designerPreviewFiles = computed(() => {
    const files = this.order()?.files ?? [];
    return files.filter(file => ['preview'].includes((file.category || '').toLowerCase()));
  });

  readonly designerFinalFiles = computed(() => {
    const files = this.order()?.files ?? [];
    return files.filter(file => ['final', 'screenshot'].includes((file.category || '').toLowerCase()));
  });

  readonly clientFiles = computed(() => [...this.clientOrderFiles(), ...this.clientResponseFiles()]);
  readonly designerFiles = computed(() => [...this.designerPreviewFiles(), ...this.designerFinalFiles()]);



  readonly isStuck = computed(() => {

    const o = this.order();

    return !!o && STUCK_STATUSES.has(o.status);

  });



  readonly isSlaPaused = computed(() => {

    const o = this.order();

    return !!o && PAUSED_STATUSES.has(o.status);

  });

  readonly slaExpectedDueAt = computed<Date | null>(() => {
    const o = this.order();
    if (!o?.slaTracking?.dueAt) {
      return null;
    }
    const dueTime = Date.parse(o.slaTracking.dueAt);
    if (Number.isNaN(dueTime)) {
      return null;
    }

    const totalPausedMs = (o.slaTracking?.totalPausedMinutes ?? 0) * 60 * 1000;
    const currentPausedMs = o.slaTracking?.pausedAt && this.isSlaPaused()
      ? Math.max(0, Date.now() - Date.parse(o.slaTracking.pausedAt))
      : 0;

    const expectedTime = dueTime + totalPausedMs + currentPausedMs;
    return Number.isNaN(expectedTime) ? null : new Date(expectedTime);
  });

  readonly isSlaBreached = computed(() => {
    const o = this.order();
    if (!o?.slaTracking?.dueAt) {
      return false;
    }
    if (o.status === OrderStatus.Completed || this.isSlaPaused()) {
      return false;
    }

    const dueTime = Date.parse(o.slaTracking.dueAt);
    if (Number.isNaN(dueTime)) {
      return !!o.slaTracking.isBreached;
    }

    return !!o.slaTracking.isBreached || Date.now() > dueTime + (o.slaTracking?.totalPausedMinutes ?? 0) * 60 * 1000;
  });


  ngOnInit(): void {

    this.loadOrder();

    this.loadHistory();

    this.loadDesigners();

  }



  loadOrder(): void {

    this.isLoading.set(true);

    this.orderService.getOrder(this.orderId).subscribe({

      next: (order) => { 

        this.order.set(order); 

        // Set default pricing in input if quotation pricing is set
        const quotationLine = order.services?.find(s => s.subtotal > 0 || s.priceCharged > 0);
        if (quotationLine) {
          this.quotationPrice.set(quotationLine.priceCharged);
        } else {
          this.quotationPrice.set(0);
        }

        this.isLoading.set(false); 

      },

      error: () => {

        this.toast.error('تعذر تحميل بيانات الطلب');

        this.isLoading.set(false);

      }

    });

  }



  loadHistory(): void {

    this.isLoadingHistory.set(true);

    this.orderService.getOrderStatusHistory(this.orderId).subscribe({

      next: (h) => { 

        this.history.set(h || []); 

        this.isLoadingHistory.set(false); 

      },

      error: () => this.isLoadingHistory.set(false)

    });

  }



  loadDesigners(): void {

    this.adminService.getDesigners(1, 200, true).subscribe({

      next: (res: any) => {

        const items = res?.items || res?.data || res || [];

        this.designers.set(

          items.map((u: any) => ({

            id: u.id,

            fullName: u.fullName,

            email: u.email,

            specialization: u.designerProfile?.specialization || '',

            rating: u.designerProfile?.rating || 0,

            level: u.designerProfile?.level || 0,

            isAvailable: u.isActive !== false

          }))

        );

      },

      error: () => {

        this.toast.error('Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…ØµÙ…Ù…ÙŠÙ†');

      }

    });

  }



  // â”€â”€ Status actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  selectAction(action: StatusAction): void {

    this.pendingAction.set(action);

    this.actionNotes.set('');

    this.sendPreview.set(false);

  }



  cancelAction(): void {

    this.pendingAction.set(null);

  }



  confirmAction(): void {

    const order = this.order();

    const action = this.pendingAction();

    if (!order || !action) return;



    if (action.requiresNotes && !this.actionNotes().trim()) {

      this.toast.error('ÙŠØ¬Ø¨ Ø¥Ø¶Ø§ÙØ© Ù…Ù„Ø§Ø­Ø¸Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡');

      return;

    }



    this.isSubmittingAction.set(true);

    this.orderService.updateStatus(order.id, {

      status: action.next,

      notes: this.actionNotes(),

      sendPreview: action.requiresPreview ? this.sendPreview() : false

    }).subscribe({

      next: (updated) => {

        this.order.set(updated);

        this.toast.success('Updated successfully');

        this.pendingAction.set(null);

        this.isSubmittingAction.set(false);

        this.loadHistory();

      },

      error: (err) => {

        this.toast.error(err?.error?.message || 'ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø©');

        this.isSubmittingAction.set(false);

      }

    });

  }



  // â”€â”€ Assign / reassign designer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  openAssignModal(): void { 

    this.showAssignModal.set(true); 

  }

  

  closeAssignModal(): void { 

    this.showAssignModal.set(false); 

  }



  onAssign(payload: { designerId: string }): void {

    const order = this.order();

    if (!order) return;

    this.isAssigning.set(true);

    this.orderService.assignDesigner(order.id, payload.designerId).subscribe({

      next: (updated) => {

        this.order.set(updated);

        this.toast.success('ØªÙ… Ø¥Ø³Ù†Ø§Ø¯ Ø§Ù„Ø·Ù„Ø¨ Ù„Ù„Ù…ØµÙ…Ù… Ø¨Ù†Ø¬Ø§Ø­');

        this.isAssigning.set(false);

        this.closeAssignModal();

        this.loadHistory();

      },

      error: () => {

        this.toast.error('ØªØ¹Ø°Ø± Ø¥Ø³Ù†Ø§Ø¯ Ø§Ù„Ø·Ù„Ø¨');

        this.isAssigning.set(false);

      }

    });

  }



  currentDesignerId(): string | null {

    return this.order()?.designerId ?? null;

  }



  currentDesignerName(): string | null {
    const order = this.order();
    if (!order?.designerId) return null;
    // Use designerName directly from OrderDto (returned by backend)
    // Fallback to local designers list lookup for extra info if available
    const localDesigner = this.designers().find(d => d.id === order.designerId);
    if (order.designerName) {
      return localDesigner
        ? `${order.designerName} (${localDesigner.rating} - L${localDesigner.level})`
        : order.designerName;
    }
    if (!localDesigner) return null;
    return `${localDesigner.fullName} (${localDesigner.rating} - L${localDesigner.level})`;
  }



  // â”€â”€ Redo / revision (paid or free) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  openRedoPanel(): void {

    this.redoIsPaid.set(false);

    this.redoAmount.set(0);

    this.redoNotes.set('');

    this.showRedoPanel.set(true);

  }



  closeRedoPanel(): void { 

    this.showRedoPanel.set(false); 

  }



  submitRedo(): void {

    const order = this.order();

    if (!order) return;

    this.isSubmittingRedo.set(true);

    this.orderService.reopenForRedo(order.id, {

      isPaid: this.redoIsPaid(),

      extraAmount: this.redoIsPaid() ? this.redoAmount() : 0,

      notes: this.redoNotes()

    }).subscribe({

      next: (updated) => {

        this.order.set(updated);

        this.toast.success('ØªÙ…Øª Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Ø§Ù„Ø·Ù„Ø¨ Ù„Ù„ØªØµÙ…ÙŠÙ…');

        this.isSubmittingRedo.set(false);

        this.showRedoPanel.set(false);

        this.loadHistory();

      },

      error: () => {

        this.toast.error('ØªØ¹Ø°Ø± Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Ø§Ù„Ø·Ù„Ø¨');

        this.isSubmittingRedo.set(false);

      }

    });

  }



  // â”€â”€ Files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  downloadFile(fileId: string): void {

    this.orderService.getFileDownloadUrl(fileId).subscribe({

      next: (res) => window.open(res.url, '_blank'),

      error: () => this.toast.error('ØªØ¹Ø°Ø± Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø±Ø§Ø¨Ø· Ø§Ù„ØªØ­Ù…ÙŠÙ„')

    });

  }



  statusLabel(status: OrderStatus): string { 

    return statusLabel(status); 

  }



  statusMeta(status: OrderStatus) { 

    return STATUS_META[status]; 

  }



  submitQuotationPrice(): void {
    const order = this.order();
    const price = this.quotationPrice();
    if (!order || price <= 0) {
      this.toast.error('يرجى إدخال سعر صحيح أكبر من الصفر');
      return;
    }

    this.isSettingQuotationPrice.set(true);
    this.orderService.setQuotationPrice(order.id, price).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.toast.success('تم تحديد سعر التسعيرة بنجاح');
        this.isSettingQuotationPrice.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'فشل تحديد سعر التسعيرة');
        this.isSettingQuotationPrice.set(false);
      }
    });
  }

  approveQuotation(): void {
    const order = this.order();
    if (!order || this.isProcessing()) return;

    if (confirm(this.i18n.currentLang() === 'ar' ? 'هل أنت موافق على اعتماد التسعيرة وخصمها من محفظة العميل؟' : 'Are you sure you want to approve this quotation and debit the client\'s wallet?')) {
      this.isProcessing.set(true);
      this.orderService.approveQuotation(order.id).subscribe({
        next: (updated) => {
          this.order.set(updated);
          this.toast.success(this.i18n.currentLang() === 'ar' ? 'تم اعتماد التسعيرة ودفع القيمة بنجاح!' : 'Quotation approved and paid successfully!');
          this.isProcessing.set(false);
          this.loadOrder();
        },
        error: (err) => {
          this.isProcessing.set(false);
          this.toast.error(err.error?.message || 'فشل إتمام العملية. تأكد من رصيد محفظة العميل.');
        }
      });
    }
  }

  goBack(): void { 

    this.router.navigate(['/admin/orders']); 

  }

}








