import { Component, forwardRef, signal, computed, ElementRef, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface Country {
  nameAr: string;
  nameEn: string;
  code: string;
  flag: string;
  dialCode: string;
}

export const COUNTRIES_DATA: Country[] = [
  // الدول العربية والإقليمية
  { nameAr: 'المملكة العربية السعودية', nameEn: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', dialCode: '+966' },
  { nameAr: 'الإمارات العربية المتحدة', nameEn: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', dialCode: '+971' },
  { nameAr: 'مصر', nameEn: 'Egypt', code: 'EG', flag: '🇪🇬', dialCode: '+20' },
  { nameAr: 'الكويت', nameEn: 'Kuwait', code: 'KW', flag: '🇰🇼', dialCode: '+965' },
  { nameAr: 'قطر', nameEn: 'Qatar', code: 'QA', flag: '🇶🇦', dialCode: '+974' },
  { nameAr: 'سلطنة عمان', nameEn: 'Oman', code: 'OM', flag: '🇴🇲', dialCode: '+968' },
  { nameAr: 'البحرين', nameEn: 'Bahrain', code: 'BH', flag: '🇧🇭', dialCode: '+973' },
  { nameAr: 'الأردن', nameEn: 'Jordan', code: 'JO', flag: '🇯🇴', dialCode: '+962' },
  { nameAr: 'العراق', nameEn: 'Iraq', code: 'IQ', flag: '🇮🇶', dialCode: '+964' },
  { nameAr: 'لبنان', nameEn: 'Lebanon', code: 'LB', flag: '🇱🇧', dialCode: '+961' },
  { nameAr: 'فلسطين', nameEn: 'Palestine', code: 'PS', flag: '🇵🇸', dialCode: '+970' },
  { nameAr: 'سوريا', nameEn: 'Syria', code: 'SY', flag: '🇸🇾', dialCode: '+963' },
  { nameAr: 'اليمن', nameEn: 'Yemen', code: 'YE', flag: '🇾🇪', dialCode: '+967' },
  { nameAr: 'ليبيا', nameEn: 'Libya', code: 'LY', flag: '🇱🇾', dialCode: '+218' },
  { nameAr: 'تونس', nameEn: 'Tunisia', code: 'TN', flag: '🇹🇳', dialCode: '+216' },
  { nameAr: 'الجزائر', nameEn: 'Algeria', code: 'DZ', flag: '🇩🇿', dialCode: '+213' },
  { nameAr: 'المغرب', nameEn: 'Morocco', code: 'MA', flag: '🇲🇦', dialCode: '+212' },
  { nameAr: 'السودان', nameEn: 'Sudan', code: 'SD', flag: '🇸🇩', dialCode: '+249' },
  { nameAr: 'موريتانيا', nameEn: 'Mauritania', code: 'MR', flag: '🇲🇷', dialCode: '+222' },
  { nameAr: 'الصومال', nameEn: 'Somalia', code: 'SO', flag: '🇸🇴', dialCode: '+252' },
  { nameAr: 'جيبوتي', nameEn: 'Djibouti', code: 'DJ', flag: '🇩🇯', dialCode: '+253' },
  { nameAr: 'جزر القمر', nameEn: 'Comoros', code: 'KM', flag: '🇰🇲', dialCode: '+269' },

  // آسيا والشرق الأوسط
  { nameAr: 'تركيا', nameEn: 'Turkey', code: 'TR', flag: '🇹🇷', dialCode: '+90' },
  { nameAr: 'إيران', nameEn: 'Iran', code: 'IR', flag: '🇮🇷', dialCode: '+98' },
  { nameAr: 'باكستان', nameEn: 'Pakistan', code: 'PK', flag: '🇵🇰', dialCode: '+92' },
  { nameAr: 'الهند', nameEn: 'India', code: 'IN', flag: '🇮🇳', dialCode: '+91' },
  { nameAr: 'الصين', nameEn: 'China', code: 'CN', flag: '🇨🇳', dialCode: '+86' },
  { nameAr: 'اليابان', nameEn: 'Japan', code: 'JP', flag: '🇯🇵', dialCode: '+81' },
  { nameAr: 'كوريا الجنوبية', nameEn: 'South Korea', code: 'KR', flag: '🇰🇷', dialCode: '+82' },
  { nameAr: 'إندونيسيا', nameEn: 'Indonesia', code: 'ID', flag: '🇮🇩', dialCode: '+62' },
  { nameAr: 'ماليزيا', nameEn: 'Malaysia', code: 'MY', flag: '🇲🇾', dialCode: '+60' },
  { nameAr: 'سنغافورة', nameEn: 'Singapore', code: 'SG', flag: '🇸🇬', dialCode: '+65' },
  { nameAr: 'تايلاند', nameEn: 'Thailand', code: 'TH', flag: '🇹🇭', dialCode: '+66' },
  { nameAr: 'فيتنام', nameEn: 'Vietnam', code: 'VN', flag: '🇻🇳', dialCode: '+84' },
  { nameAr: 'الفلبين', nameEn: 'Philippines', code: 'PH', flag: '🇵🇭', dialCode: '+63' },
  { nameAr: 'بنجلاديش', nameEn: 'Bangladesh', code: 'BD', flag: '🇧🇩', dialCode: '+880' },
  { nameAr: 'سريلانكا', nameEn: 'Sri Lanka', code: 'LK', flag: '🇱🇰', dialCode: '+94' },
  { nameAr: 'نيبال', nameEn: 'Nepal', code: 'NP', flag: '🇳🇵', dialCode: '+977' },
  { nameAr: 'أفغانستان', nameEn: 'Afghanistan', code: 'AF', flag: '🇦🇫', dialCode: '+93' },
  { nameAr: 'كازاخستان', nameEn: 'Kazakhstan', code: 'KZ', flag: '🇰🇿', dialCode: '+7' },
  { nameAr: 'أوزبكستان', nameEn: 'Uzbekistan', code: 'UZ', flag: '🇺🇿', dialCode: '+998' },
  { nameAr: 'أذربيجان', nameEn: 'Azerbaijan', code: 'AZ', flag: '🇦🇿', dialCode: '+994' },
  { nameAr: 'جورجيا', nameEn: 'Georgia', code: 'GE', flag: '🇬🇪', dialCode: '+995' },
  { nameAr: 'أرمينيا', nameEn: 'Armenia', code: 'AM', flag: '🇦🇲', dialCode: '+374' },
  { nameAr: 'تركمانستان', nameEn: 'Turkmenistan', code: 'TM', flag: '🇹🇲', dialCode: '+993' },
  { nameAr: 'قرغيزستان', nameEn: 'Kyrgyzstan', code: 'KG', flag: '🇰🇬', dialCode: '+996' },
  { nameAr: 'طاجيكستان', nameEn: 'Tajikistan', code: 'TJ', flag: '🇹🇯', dialCode: '+992' },
  { nameAr: 'قبرص', nameEn: 'Cyprus', code: 'CY', flag: '🇨🇾', dialCode: '+357' },

  // أوروبا
  { nameAr: 'المملكة المتحدة', nameEn: 'United Kingdom', code: 'GB', flag: '🇬🇧', dialCode: '+44' },
  { nameAr: 'ألمانيا', nameEn: 'Germany', code: 'DE', flag: '🇩🇪', dialCode: '+49' },
  { nameAr: 'فرنسا', nameEn: 'France', code: 'FR', flag: '🇫🇷', dialCode: '+33' },
  { nameAr: 'إيطاليا', nameEn: 'Italy', code: 'IT', flag: '🇮🇹', dialCode: '+39' },
  { nameAr: 'إسبانيا', nameEn: 'Spain', code: 'ES', flag: '🇪🇸', dialCode: '+34' },
  { nameAr: 'هولندا', nameEn: 'Netherlands', code: 'NL', flag: '🇳🇱', dialCode: '+31' },
  { nameAr: 'سويسرا', nameEn: 'Switzerland', code: 'CH', flag: '🇨🇭', dialCode: '+41' },
  { nameAr: 'السويد', nameEn: 'Sweden', code: 'SE', flag: '🇸🇪', dialCode: '+46' },
  { nameAr: 'النرويج', nameEn: 'Norway', code: 'NO', flag: '🇳🇴', dialCode: '+47' },
  { nameAr: 'الدنمارك', nameEn: 'Denmark', code: 'DK', flag: '🇩🇰', dialCode: '+45' },
  { nameAr: 'فنلندا', nameEn: 'Finland', code: 'FI', flag: '🇫🇮', dialCode: '+358' },
  { nameAr: 'بلجيكا', nameEn: 'Belgium', code: 'BE', flag: '🇧🇪', dialCode: '+32' },
  { nameAr: 'النمسا', nameEn: 'Austria', code: 'AT', flag: '🇦🇹', dialCode: '+43' },
  { nameAr: 'بولندا', nameEn: 'Poland', code: 'PL', flag: '🇵🇱', dialCode: '+48' },
  { nameAr: 'روسيا', nameEn: 'Russia', code: 'RU', flag: '🇷🇺', dialCode: '+7' },
  { nameAr: 'أوكرانيا', nameEn: 'Ukraine', code: 'UA', flag: '🇺🇦', dialCode: '+380' },
  { nameAr: 'اليونان', nameEn: 'Greece', code: 'GR', flag: '🇬🇷', dialCode: '+30' },
  { nameAr: 'البرتغال', nameEn: 'Portugal', code: 'PT', flag: '🇵🇹', dialCode: '+351' },
  { nameAr: 'أيرلندا', nameEn: 'Ireland', code: 'IE', flag: '🇮🇪', dialCode: '+353' },
  { nameAr: 'رومانيا', nameEn: 'Romania', code: 'RO', flag: '🇷🇴', dialCode: '+40' },
  { nameAr: 'جمهورية التشيك', nameEn: 'Czech Republic', code: 'CZ', flag: '🇨🇿', dialCode: '+420' },
  { nameAr: 'المجر', nameEn: 'Hungary', code: 'HU', flag: '🇭🇺', dialCode: '+36' },
  { nameAr: 'بلغاريا', nameEn: 'Bulgaria', code: 'BG', flag: '🇧🇬', dialCode: '+359' },
  { nameAr: 'كرواتيا', nameEn: 'Croatia', code: 'HR', flag: '🇭🇷', dialCode: '+385' },
  { nameAr: 'صربيا', nameEn: 'Serbia', code: 'RS', flag: '🇷🇸', dialCode: '+381' },
  { nameAr: 'سلوفاكيا', nameEn: 'Slovakia', code: 'SK', flag: '🇸🇰', dialCode: '+421' },
  { nameAr: 'البوسنة والهرسك', nameEn: 'Bosnia and Herzegovina', code: 'BA', flag: '🇧🇦', dialCode: '+387' },
  { nameAr: 'ألبانيا', nameEn: 'Albania', code: 'AL', flag: '🇦🇱', dialCode: '+355' },
  { nameAr: 'أيسلندا', nameEn: 'Iceland', code: 'IS', flag: '🇮🇸', dialCode: '+354' },

  // الأمريكتان
  { nameAr: 'الولايات المتحدة الأمريكية', nameEn: 'United States', code: 'US', flag: '🇺🇸', dialCode: '+1' },
  { nameAr: 'كندا', nameEn: 'Canada', code: 'CA', flag: '🇨🇦', dialCode: '+1' },
  { nameAr: 'المكسيك', nameEn: 'Mexico', code: 'MX', flag: '🇲🇽', dialCode: '+52' },
  { nameAr: 'البرازيل', nameEn: 'Brazil', code: 'BR', flag: '🇧🇷', dialCode: '+55' },
  { nameAr: 'الأرجنتين', nameEn: 'Argentina', code: 'AR', flag: '🇦🇷', dialCode: '+54' },
  { nameAr: 'كولومبيا', nameEn: 'Colombia', code: 'CO', flag: '🇨🇴', dialCode: '+57' },
  { nameAr: 'تشيلي', nameEn: 'Chile', code: 'CL', flag: '🇨🇱', dialCode: '+56' },
  { nameAr: 'بيرو', nameEn: 'Peru', code: 'PE', flag: '🇵🇪', dialCode: '+51' },
  { nameAr: 'فنزويلا', nameEn: 'Venezuela', code: 'VE', flag: '🇻🇪', dialCode: '+58' },
  { nameAr: 'إكوادور', nameEn: 'Ecuador', code: 'EC', flag: '🇪🇨', dialCode: '+593' },

  // أفريقيا
  { nameAr: 'جنوب أفريقيا', nameEn: 'South Africa', code: 'ZA', flag: '🇿🇦', dialCode: '+27' },
  { nameAr: 'نيجيريا', nameEn: 'Nigeria', code: 'NG', flag: '🇳🇬', dialCode: '+234' },
  { nameAr: 'كينيا', nameEn: 'Kenya', code: 'KE', flag: '🇰🇪', dialCode: '+254' },
  { nameAr: 'إثيوبيا', nameEn: 'Ethiopia', code: 'ET', flag: '🇪🇹', dialCode: '+251' },
  { nameAr: 'غانا', nameEn: 'Ghana', code: 'GH', flag: '🇬🇭', dialCode: '+233' },
  { nameAr: 'السنغال', nameEn: 'Senegal', code: 'SN', flag: '🇸🇳', dialCode: '+221' },
  { nameAr: 'ساحل العاج', nameEn: 'Ivory Coast', code: 'CI', flag: '🇨🇮', dialCode: '+225' },
  { nameAr: 'تنزانيا', nameEn: 'Tanzania', code: 'TZ', flag: '🇹🇿', dialCode: '+255' },
  { nameAr: 'أوغندا', nameEn: 'Uganda', code: 'UG', flag: '🇺🇬', dialCode: '+256' },
  { nameAr: 'الكاميرون', nameEn: 'Cameroon', code: 'CM', flag: '🇨🇲', dialCode: '+237' },

  // أوقيانوسيا
  { nameAr: 'أستراليا', nameEn: 'Australia', code: 'AU', flag: '🇦🇺', dialCode: '+61' },
  { nameAr: 'نيوزيلندا', nameEn: 'New Zealand', code: 'NZ', flag: '🇳🇿', dialCode: '+64' }
];

@Component({
  selector: 'app-country-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CountrySelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="relative w-full">
      <!-- Selected Dropdown Trigger Button -->
      <button
        type="button"
        [id]="id"
        (click)="toggleDropdown()"
        [disabled]="disabled"
        class="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-secondary flex items-center justify-between focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition duration-200"
        [class.opacity-60]="disabled"
      >
        @if (selectedCountry()) {
          <div class="flex items-center gap-2.5 truncate">
            <span class="text-lg leading-none">{{ selectedCountry()?.flag }}</span>
            <span class="font-semibold text-secondary">{{ selectedCountry()?.nameAr }}</span>
            <span class="text-xs text-text-secondary dir-ltr">({{ selectedCountry()?.dialCode }})</span>
          </div>
        } @else {
          <span class="text-text-secondary font-medium">{{ placeholder }}</span>
        }
        
        <svg
          class="w-4 h-4 text-text-secondary transition-transform duration-200"
          [class.rotate-180]="isOpen()"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown Panel -->
      @if (isOpen()) {
        <div class="absolute z-50 top-full start-0 end-0 mt-1 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <!-- Search Header -->
          <div class="p-2.5 border-b border-border bg-background/60">
            <div class="relative">
              <input
                type="text"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                placeholder="ابحث باسم الدولة أو الكود..."
                class="w-full ps-9 pe-3 py-2 rounded-xl bg-background border border-border text-xs text-secondary focus:outline-none focus:border-primary"
                #searchInput
              />
              <svg class="w-4 h-4 absolute start-2.5 top-1/2 -translate-y-1/2 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <!-- Country List -->
          <div class="max-h-56 overflow-y-auto p-1 custom-scrollbar">
            @for (c of filteredCountries(); track c.code) {
              <button
                type="button"
                (click)="selectCountry(c)"
                class="w-full text-start px-3 py-2.5 rounded-xl hover:bg-primary/10 hover:text-primary transition flex items-center justify-between text-xs group"
                [class.bg-primary/5]="selectedCountry()?.code === c.code"
                [class.font-bold]="selectedCountry()?.code === c.code"
              >
                <div class="flex items-center gap-2.5">
                  <span class="text-base leading-none">{{ c.flag }}</span>
                  <span class="text-secondary group-hover:text-primary">{{ c.nameAr }}</span>
                  <span class="text-[10px] text-text-secondary">({{ c.nameEn }})</span>
                </div>
                <span class="text-[11px] text-text-secondary font-mono dir-ltr">{{ c.dialCode }}</span>
              </button>
            } @empty {
              <div class="p-4 text-center text-xs text-text-secondary">
                لا توجد نتائج مطابقة للبحث
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class CountrySelectComponent implements ControlValueAccessor {
  @Input() id = 'country-select';
  @Input() placeholder = 'اختر الدولة...';
  @Input() disabled = false;

  readonly countries = COUNTRIES_DATA;
  readonly isOpen = signal(false);
  readonly searchQuery = signal('');
  readonly selectedCountry = signal<Country | null>(COUNTRIES_DATA[0]);

  readonly filteredCountries = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.countries;
    return this.countries.filter(c =>
      c.nameAr.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleDropdown() {
    if (this.disabled) return;
    this.isOpen.update(v => !v);
  }

  selectCountry(country: Country) {
    this.selectedCountry.set(country);
    this.onChange(country.nameAr);
    this.onTouched();
    this.isOpen.set(false);
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (!value) {
      this.selectedCountry.set(COUNTRIES_DATA[0]);
      return;
    }
    const found = this.countries.find(
      c => c.nameAr === value || c.nameEn === value || c.code === value
    );
    if (found) {
      this.selectedCountry.set(found);
    } else if (typeof value === 'string') {
      this.selectedCountry.set({
        nameAr: value,
        nameEn: value,
        code: 'CUSTOM',
        flag: '🌐',
        dialCode: ''
      });
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
