import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { inject } from '@angular/core';

interface Platform {
  id: string;
  nameAr: string;
  nameEn: string;
  logoSvg: string;
  color: string;
  bgColor: string;
  borderColor: string;
  url: string;
  description: string;
  category: string;
  supportsIframe?: boolean;
}

interface SavedCredential {
  username: string;
  password: string;
  savedAt: number;
}

const CREDENTIALS_STORAGE_KEY = 'platforms_saved_credentials_v1';
const NOTIFICATIONS_STORAGE_KEY = 'platforms_notifications_v1';
const CUSTOM_PLATFORMS_STORAGE_KEY = 'platforms_custom_platforms_v1';

@Component({
  selector: 'app-platforms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './platforms.component.html',
  styleUrl: './platforms.component.scss'
})
export class PlatformsComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly activePlatformId = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly customUrl = signal('');
  readonly customName = signal('');
  readonly iframeError = signal(false);
  readonly isIframeLoading = signal(false);

  // ---- Saved login credentials (stored locally in the browser) ----
  readonly savedCredentials = signal<Record<string, SavedCredential>>(this.loadCredentials());
  readonly credentialsModalPlatformId = signal<string | null>(null);
  readonly credUsername = signal('');
  readonly credPassword = signal('');
  readonly showPassword = signal(false);
  readonly credCopiedField = signal<'user' | 'pass' | null>(null);

  // ---- Notification counters per platform ----
  // NOTE: this is placeholder/local state. Wire `refreshNotifications()` up to
  // your real backend / platform APIs to pull live unread counts.
  readonly notificationsMap = signal<Record<string, number>>(this.loadNotifications());

  readonly platforms: Platform[] = [
    {
      id: 'r11-dscore',
      nameAr: 'R11 DScore',
      nameEn: 'R11 DScore',
      logoSvg: `
        <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-r11" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#38bdf8"/>
              <stop offset="100%" stop-color="#0284c7"/>
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="11" fill="url(#grad-r11)"/>
          <path d="M20 8c-3.6 0-6.2 2.6-6.2 6.4 0 3.9 3.1 8.4 4.8 12.9.3.8 1.4.8 1.7 0 1.7-4.5 4.8-9 4.8-12.9C25.1 10.6 23.6 8 20 8z" fill="white" opacity="0.95"/>
          <path d="M20 8c-3.6 0-6.2 2.6-6.2 6.4 0 1.5.4 3.1 1 4.7 1.1-.5 2.2-1.7 2.2-3.4 0-1.6-1-2.6-1-4 0-1.6 1.3-2.9 3-2.9s3 1.3 3 2.9c0 1.4-1 2.4-1 4 0 1.7 1.1 2.9 2.2 3.4.6-1.6 1-3.2 1-4.7C25.1 10.6 23.6 8 20 8z" fill="url(#grad-r11)" opacity="0.35"/>
          <rect x="12" y="30" width="3.2" height="4.5" rx="1" fill="white"/>
          <rect x="18.4" y="27.5" width="3.2" height="7" rx="1" fill="white"/>
          <rect x="24.8" y="25" width="3.2" height="9.5" rx="1" fill="white" opacity="0.9"/>
        </svg>
      `,
      color: '#0ea5e9',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      url: 'https://login.r11.dscore.com/#/login?client_id=lightning-app-r11&redirect_uri=https://r11.dscore.com/%23/token-exchange&scope=openid+r11-dscore&code_challenge=cS6_jUTWHda2UdNWGl4brShVbkp2sTdCGUhFNUXNXmI&state=ede435975acc92d2aa3d6a8137250b256e38efd5b5e9449ea5fddaae6e67d9a4',
      description: 'منصة تحليل التصاميم الرقمية وتقييم جودة الأسنان',
      category: 'تحليل وتقييم',
      supportsIframe: false
    },
    {
      id: 'meditlink',
      nameAr: 'MeditLink',
      nameEn: 'MeditLink',
      logoSvg: `
        <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-medit" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#818cf8"/>
              <stop offset="100%" stop-color="#4f46e5"/>
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="11" fill="url(#grad-medit)"/>
          <g fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round">
            <rect x="9" y="16" width="10" height="8" rx="4" transform="rotate(-35 14 20)"/>
            <rect x="21" y="16" width="10" height="8" rx="4" transform="rotate(-35 26 20)"/>
          </g>
        </svg>
      `,
      color: '#6366f1',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      url: 'https://www.meditlink.com/login',
      description: 'منصة Medit لمشاركة بيانات الماسحات الضوئية ثلاثية الأبعاد',
      category: 'مشاركة بيانات',
      supportsIframe: false
    },
    {
      id: 'itero-cloud',
      nameAr: 'iTero Cloud',
      nameEn: 'iTero Cloud',
      logoSvg: `
        <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-itero" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#34d399"/>
              <stop offset="100%" stop-color="#059669"/>
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="11" fill="url(#grad-itero)"/>
          <path d="M12.5 25.5a4.5 4.5 0 0 1 .6-8.96 6 6 0 0 1 11.6-1.9 5 5 0 0 1 1.3 9.86H12.5z" fill="white"/>
          <circle cx="15.2" cy="29.5" r="1.3" fill="white"/>
          <circle cx="19.4" cy="30.6" r="1.3" fill="white" opacity="0.85"/>
          <circle cx="23.6" cy="29.2" r="1.3" fill="white" opacity="0.7"/>
        </svg>
      `,
      color: '#059669',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      url: 'https://pre-login-app-prod-ap-northeast-1.iterocloud.com/pre-login',
      description: 'منصة iTero السحابية لإدارة وعرض بيانات الأسنان الرقمية',
      category: 'سحابي',
      supportsIframe: true
    },
    {
      id: '3shape',
      nameAr: '3Shape Communicate',
      nameEn: '3Shape Communicate',
      logoSvg: `
        <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-3shape" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#f87171"/>
              <stop offset="100%" stop-color="#b91c1c"/>
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="11" fill="url(#grad-3shape)"/>
          <g fill="white">
            <polygon points="20,9 29,14.5 29,25.5 20,31 11,25.5 11,14.5" opacity="0.18"/>
            <polygon points="20,9 29,14.5 20,20 11,14.5"/>
            <polygon points="11,14.5 20,20 20,31 11,25.5" opacity="0.75"/>
            <polygon points="29,14.5 20,20 20,31 29,25.5" opacity="0.55"/>
          </g>
        </svg>
      `,
      color: '#dc2626',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      url: 'https://identity.3shape.com/Account/Login',
      description: 'منصة التواصل والتشاور المتكاملة من 3Shape للتصاميم الرقمية',
      category: 'تشاور',
      supportsIframe: false
    }
  ];

  private readonly defaultCustomLogo = `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-custom" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#a78bfa"/>
          <stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#grad-custom)"/>
      <g fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
        <circle cx="20" cy="20" r="8.5"/>
        <ellipse cx="20" cy="20" rx="3.6" ry="8.5"/>
        <path d="M11.7 16h16.6M11.7 24h16.6"/>
      </g>
    </svg>
  `;

  readonly customPlatforms = signal<Platform[]>(this.loadCustomPlatforms());

  readonly allPlatforms = computed(() => [...this.platforms, ...this.customPlatforms()]);

  readonly activePlatform = computed(() => {
    const id = this.activePlatformId();
    if (!id) return null;
    return this.allPlatforms().find(p => p.id === id) || null;
  });

  readonly safeUrl = computed((): SafeResourceUrl | null => {
    const platform = this.activePlatform();
    if (!platform || !platform.supportsIframe) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(platform.url);
  });

  // The credentials currently loaded in the modal's target platform, if any
  readonly activeCredential = computed((): SavedCredential | null => {
    const id = this.credentialsModalPlatformId();
    if (!id) return null;
    return this.savedCredentials()[id] ?? null;
  });

  // ---------------- Logo rendering ----------------

  getSafeLogo(platform: Platform): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(platform.logoSvg || this.defaultCustomLogo);
  }

  // ---------------- Notifications ----------------

  getNotificationCount(platformId: string): number {
    return this.notificationsMap()[platformId] ?? 0;
  }

  private loadNotifications(): Record<string, number> {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private persistNotifications(): void {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(this.notificationsMap()));
    } catch {
      // ignore storage failures (e.g. private browsing)
    }
  }

  /** Call this after fetching real unread counts from each platform's API. */
  setNotificationCount(platformId: string, count: number): void {
    this.notificationsMap.update(m => ({ ...m, [platformId]: Math.max(0, count) }));
    this.persistNotifications();
  }

  clearNotifications(platformId: string): void {
    this.setNotificationCount(platformId, 0);
  }

  readonly totalNotifications = computed(() =>
    Object.values(this.notificationsMap()).reduce((sum, n) => sum + n, 0)
  );

  // ---------------- Platform open/close ----------------

  openPlatform(platformId: string): void {
    this.activePlatformId.set(platformId);
    this.clearNotifications(platformId);
    const platform = this.allPlatforms().find(p => p.id === platformId);
    if (platform && !platform.supportsIframe) {
      this.iframeError.set(true);
      this.isIframeLoading.set(false);
      this.openInNewWindow();
    } else {
      this.iframeError.set(false);
      this.isIframeLoading.set(true);
    }
  }

  closePlatform(): void {
    this.activePlatformId.set(null);
    this.iframeError.set(false);
  }

  openInNewWindow(): void {
    const platform = this.activePlatform();
    if (platform) {
      window.open(platform.url, '_blank', 'noopener,noreferrer');
    }
  }

  onIframeLoad(): void {
    this.isIframeLoading.set(false);
  }

  onIframeError(): void {
    this.iframeError.set(true);
    this.isIframeLoading.set(false);
  }

  addCustomPlatform(): void {
    const url = this.customUrl().trim();
    const name = this.customName().trim();
    if (!url || !name) return;

    const newPlatform: Platform = {
      id: `custom-${Date.now()}`,
      nameAr: name,
      nameEn: name,
      logoSvg: this.defaultCustomLogo,
      color: '#7c3aed',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      url: url.startsWith('http') ? url : `https://${url}`,
      description: `منصة مخصصة: ${name}`,
      category: 'مخصص'
    };

    this.customPlatforms.update(p => [...p, newPlatform]);
    this.persistCustomPlatforms();
    this.customUrl.set('');
    this.customName.set('');
  }

  removeCustomPlatform(id: string): void {
    this.customPlatforms.update(p => p.filter(x => x.id !== id));
    this.persistCustomPlatforms();
    if (this.activePlatformId() === id) {
      this.activePlatformId.set(null);
    }
    // clean up any saved credentials/notifications tied to the removed platform
    this.deleteCredentials(id);
    this.notificationsMap.update(m => {
      const copy = { ...m };
      delete copy[id];
      return copy;
    });
    this.persistNotifications();
  }

  private loadCustomPlatforms(): Platform[] {
    try {
      const raw = localStorage.getItem(CUSTOM_PLATFORMS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persistCustomPlatforms(): void {
    try {
      localStorage.setItem(CUSTOM_PLATFORMS_STORAGE_KEY, JSON.stringify(this.customPlatforms()));
    } catch {
      // ignore storage failures (e.g. private browsing / quota)
    }
  }

  // ---------------- Saved login credentials ----------------

  private loadCredentials(): Record<string, SavedCredential> {
    try {
      const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private persistCredentials(): void {
    try {
      localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(this.savedCredentials()));
    } catch {
      // ignore storage failures (e.g. private browsing / quota)
    }
  }

  hasSavedCredentials(platformId: string): boolean {
    return !!this.savedCredentials()[platformId];
  }

  openCredentialsModal(platformId: string, event?: Event): void {
    event?.stopPropagation();
    this.credentialsModalPlatformId.set(platformId);
    const existing = this.savedCredentials()[platformId];
    this.credUsername.set(existing?.username ?? '');
    this.credPassword.set(existing?.password ?? '');
    this.showPassword.set(false);
    this.credCopiedField.set(null);
  }

  closeCredentialsModal(): void {
    this.credentialsModalPlatformId.set(null);
    this.credUsername.set('');
    this.credPassword.set('');
    this.showPassword.set(false);
  }

  saveCredentials(): void {
    const id = this.credentialsModalPlatformId();
    const username = this.credUsername().trim();
    const password = this.credPassword();
    if (!id || !username || !password) return;

    this.savedCredentials.update(m => ({
      ...m,
      [id]: { username, password, savedAt: Date.now() }
    }));
    this.persistCredentials();
    this.closeCredentialsModal();
  }

  deleteCredentials(platformId: string, event?: Event): void {
    event?.stopPropagation();
    this.savedCredentials.update(m => {
      const copy = { ...m };
      delete copy[platformId];
      return copy;
    });
    this.persistCredentials();
    if (this.credentialsModalPlatformId() === platformId) {
      this.closeCredentialsModal();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  async copyToClipboard(text: string, field: 'user' | 'pass'): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.credCopiedField.set(field);
      setTimeout(() => this.credCopiedField.set(null), 1500);
    } catch {
      // clipboard API unavailable; silently ignore
    }
  }
}