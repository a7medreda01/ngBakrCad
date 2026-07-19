import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-wallet',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex flex-col gap-6">
      <div class="border-b border-border pb-4">
        <h1 class="text-xl font-extrabold text-secondary">إدارة أرصدة المحافظ</h1>
        <p class="text-xs text-text-secondary mt-1">تتم إدارة المحافظ المالية والائتمانية بشكل متكامل مباشرة من صفحة المستخدمين</p>
      </div>
      
      <div class="bg-surface rounded-2xl border border-border p-8 shadow-card flex flex-col items-center gap-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-slate-300"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
        <div>
          <p class="text-sm font-bold text-secondary">إدارة الحركات والائتمان</p>
          <p class="text-xs text-text-secondary mt-1">يرجى الانتقال لصفحة المستخدمين واختيار العيادة أو المعمل للقيام بالتسويات المالية وضبط سقف الديون.</p>
        </div>
        <a routerLink="/admin/users" class="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl transition">
          الانتقال لإدارة المستخدمين
        </a>
      </div>
    </div>
  `
})
export class AdminWalletComponent {}
