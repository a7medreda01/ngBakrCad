import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastService } from '../../../core/services/toast.service';
import { WalletService } from '../../../core/services/wallet.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly walletService = inject(WalletService);

  readonly isLoading = signal(false);
  readonly isSaving = signal<string | null>(null); // key of setting being saved

  // system settings loaded from API
  readonly settings = signal<any[]>([]);

  // editable map
  editValues: Record<string, string> = {};

  readonly settingLabels: Record<string, { label: string; description: string; icon: string }> = {
    WelcomeBonusAmount: {
      label: 'مكافأة ترحيب الأطباء (ريال)',
      description: 'مبلغ الحد الائتماني الممنوح تلقائياً للطبيب عند تفعيل البريد الإلكتروني',
      icon: 'bi bi-gift'
    },
    MinimumWithdrawalAmount: {
      label: 'الحد الأدنى لطلب السحب (ريال)',
      description: 'أقل مبلغ يمكن للمصمم سحبه في طلب واحد',
      icon: 'bi bi-wallet2'
    },
    StorageProvider: {
      label: 'مزود خدمة التخزين السحابي',
      description: 'اختر مكان تخزين الملفات الجديدة المرفوعة (المحلية أم Cloudflare R2)',
      icon: 'bi bi-cloud-arrow-up'
    }
  };

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading.set(true);
    this.walletService.getSettings().subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : (res?.data || []);
        this.settings.set(list);
        list.forEach((s: any) => {
          this.editValues[s.key] = String(s.value);
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('فشل تحميل إعدادات النظام');
      }
    });
  }

  saveSetting(key: string): void {
    const value = this.editValues[key];
    if (key !== 'StorageProvider' && (!value || isNaN(+value) || +value <= 0)) {
      this.toast.error('يرجى إدخال قيمة رقمية صحيحة أكبر من صفر');
      return;
    }
    this.isSaving.set(key);
    this.walletService.updateSetting(key, String(value)).subscribe({
      next: () => {
        this.toast.success(`تم تحديث إعداد "${this.settingLabels[key]?.label || key}" بنجاح`);
        this.isSaving.set(null);
        this.loadSettings();
      },
      error: (err) => {
        this.isSaving.set(null);
        this.toast.error(err?.error?.message || 'فشل حفظ الإعداد');
      }
    });
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}
