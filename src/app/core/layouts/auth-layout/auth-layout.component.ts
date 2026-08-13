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
      <!-- Left side: Brand Identity Panel (fixed height, unaffected by form) -->
      <div class="hidden md:flex md:w-1/2 md:sticky md:top-0 md:h-screen md:self-start brand-gradient text-white flex-col justify-between p-12 relative overflow-hidden">
        <!-- Decorative background layers -->
        <div class="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
        <div class="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
        <div class="absolute inset-0 opacity-[0.04]"
             style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 24px 24px;">
        </div>

        <!-- Logo: large, centered, hero-style -->
        <div class="flex flex-col items-center text-center gap-5 relative z-10 pt-4">
          <div class="w-full h-30 rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-black/30">
            <img src="/logo.png" alt="BKR CAD" class="w-full h-full object-contain" />
          </div>

        </div>

        <!-- Hero content -->
        <div class="max-w-md relative z-10">


          <h1 class="text-4xl font-extrabold leading-tight mb-4 text-white">
            تصاميم أسنان رقمية فائقة الدقة، بإشراف مهندسي CAD
          </h1>

          <p class="text-white/75 text-sm leading-relaxed mb-8">
            نتولى تصميم تركيباتك السنية رقمياً من الاستلام إلى ملف STL جاهز للتصنيع، بدقة عالية وإشراف كامل من فريقنا الهندسي في كل خطوة.
          </p>

          <!-- Feature highlights -->
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <span class="text-sm text-white/85">تسليم سريع وملفات جاهزة للتصنيع</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <span class="text-sm text-white/85">فريق هندسي متخصص في كل مشروع</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <span class="text-sm text-white/85">متابعة ودعم فني على مدار التصميم</span>
            </div>
          </div>
        </div>

        <div class="text-xs text-white/50 relative z-10 text-center">
          &copy; 2026 BKR CAD. جميع الحقوق محفوظة.
        </div>
      </div>

      <!-- Right side: Authentication Form Container (scrolls independently) -->
      <div class="flex-1 flex flex-col justify-between p-6 sm:p-12 bg-surface min-h-screen">
        <div class="flex justify-between items-center md:justify-end">
          <!-- Mobile-only compact logo -->
          <div class="flex md:hidden items-center gap-2">
            <img src="/logo.png" alt="BKR CAD" class="w-8 h-8 object-contain" />
            <span class="text-sm font-bold text-text-primary">BKR CAD</span>
          </div>

          <!-- Language Toggle Switcher -->
          <button
            type="button"
            (click)="translationService.toggleLanguage()"
            [attr.aria-label]="translationService.currentLang() === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'"
            class="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 active:scale-95 px-3.5 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 5h12M9 3v2m4.343 4.343A8 8 0 016.657 15M4 21l4-4M20 21l-4-4m4 4v-4h-4"/>
            </svg>
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