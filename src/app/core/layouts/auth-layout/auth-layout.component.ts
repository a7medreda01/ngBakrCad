import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen flex flex-col md:flex-row bg-background font-sans">
      <!-- Left side: Brand Identity Panel -->
      <div class="hidden md:flex md:w-1/2 brand-gradient text-white flex-col justify-between p-12 relative overflow-hidden">
        <!-- Floating shapes -->
        <div class="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
        <div class="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>

        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md">
            <span class="text-primary font-black text-xl">B</span>
          </div>
          <span class="text-xl font-bold tracking-wide">BKR CAD</span>
        </div>

        <div class="max-w-md my-auto">
          <h1 class="text-4xl font-extrabold leading-tight mb-4">
            منصة تصميم الأسنان الرقمية المتكاملة
          </h1>
          <p class="text-white/80 text-sm leading-relaxed">
            نوفر ربطاً آمناً وفورياً بين العيادات، أطباء الأسنان، ومعامل التصميم الرقمي لتقديم أجود أنواع تصميم Restoration والأطقم بدقة متناهية.
          </p>
        </div>

        <div class="text-xs text-white/50">
          &copy; 2026 BKR CAD. جميع الحقوق محفوظة.
        </div>
      </div>

      <!-- Right side: Authentication Form Container -->
      <div class="flex-1 flex flex-col justify-between p-6 sm:p-12 bg-surface">
        <div class="flex justify-end">
          <!-- Language Toggle Switcher -->
          <button
            type="button"
            (click)="translationService.toggleLanguage()"
            class="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3.5 py-2 rounded-xl transition duration-200"
          >
            {{ translationService.currentLang() === 'ar' ? 'English' : 'عربي' }}
          </button>
        </div>

        <div class="w-full max-w-md mx-auto my-auto py-8">
          <router-outlet></router-outlet>
        </div>

        <div class="text-center text-xs text-text-secondary md:hidden">
          &copy; 2026 BKR CAD. جميع الحقوق محفوظة.
        </div>
      </div>
    </div>
  `
})
export class AuthLayoutComponent {
  readonly translationService = inject(TranslationService);
}
