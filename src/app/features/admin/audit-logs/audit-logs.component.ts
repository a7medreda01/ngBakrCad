import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AuditLogDto } from '../../../core/models';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.scss'
})
export class AuditLogsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly i18n = inject(TranslationService);

  readonly isLoading = signal(false);
  readonly logs = signal<AuditLogDto[]>([]);

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading.set(true);
    this.adminService.getAuditLogs(1, 100).subscribe({
      next: (res: any) => {
        this.logs.set(res?.data || res?.items || res || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}
