import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WalletService } from '../../../core/services/wallet.service';
import { TranslationService } from '../../../core/services/translation.service';
import { DepositPackageDto } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-packages',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './packages.component.html',
  styleUrl: './packages.component.scss'
})
export class PackagesComponent implements OnInit {
  private readonly walletService = inject(WalletService);
  private readonly fb = inject(FormBuilder);
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(false);
  readonly packages = signal<DepositPackageDto[]>([]);

  // Selected package for Edit/Create
  readonly selectedPackage = signal<DepositPackageDto | null>(null);
  readonly showEditModal = signal(false);
  readonly isCreateMode = signal(false);

  form = this.fb.group({
    nameAr: ['', [Validators.required]],
    nameEn: ['', [Validators.required]],
    paymentAmount: [0, [Validators.required, Validators.min(0)]],
    walletCreditAmount: [0, [Validators.required, Validators.min(0)]],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loadPackages();
  }

  loadPackages(): void {
    this.isLoading.set(true);
    this.walletService.getPackages().subscribe({
      next: (res) => {
        this.packages.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateModal(): void {
    this.selectedPackage.set(null);
    this.isCreateMode.set(true);
    this.form.reset({
      nameAr: '',
      nameEn: '',
      paymentAmount: 0,
      walletCreditAmount: 0,
      isActive: true
    });
    this.showEditModal.set(true);
  }

  openEditModal(pkg: DepositPackageDto): void {
    this.selectedPackage.set(pkg);
    this.isCreateMode.set(false);
    this.form.patchValue({
      nameAr: pkg.nameAr,
      nameEn: pkg.nameEn,
      paymentAmount: pkg.paymentAmount,
      walletCreditAmount: pkg.walletCreditAmount,
      isActive: pkg.isActive
    });
    this.showEditModal.set(true);
  }

  submitForm(): void {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    const req = this.form.value;

    if (this.isCreateMode()) {
      this.walletService.createPackage(req).subscribe({
        next: () => {
          this.toast.success('تم إنشاء الباقة الترويجية بنجاح');
          this.showEditModal.set(false);
          this.loadPackages();
        },
        error: () => this.isLoading.set(false)
      });
    } else {
      const pkg = this.selectedPackage();
      if (!pkg) return;

      this.walletService.updatePackage(pkg.id, req).subscribe({
        next: () => {
          this.toast.success('تم تحديث الباقة بنجاح');
          this.showEditModal.set(false);
          this.loadPackages();
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  deletePackage(id: string): void {
    if (confirm('هل أنت متأكد من رغبتك بحذف هذه الباقة؟')) {
      this.walletService.deletePackage(id).subscribe({
        next: () => {
          this.toast.success('تم حذف الباقة بنجاح');
          this.loadPackages();
        }
      });
    }
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}
