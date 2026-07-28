// services-map.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CatalogService } from '../../../core/services/catalog-service.service';
import { ServiceDto } from '../../../core/models';
import { PricingMethod } from '../../../core/enums';
import {
  getServiceCategory,
  OTHER_SERVICE_CATEGORY,
  SERVICE_CATEGORY_ORDER,
  ServiceCategory,
} from '../../../core/constants/service-category.mapping';
import { TranslationService } from '../../../core/services/translation.service';

interface PublicService extends ServiceDto {
  category: ServiceCategory;
}

interface ArchPoint {
  x: number;
  y: number;
}

type JawSelection = 'upper' | 'lower' | 'both';
type PricingKind = 'tooth' | 'jaw' | 'assessment' | 'fixed';

const TEETH_PER_ARCH = 16;

@Component({
  selector: 'app-services-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services-map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesMapComponent implements OnInit {
  readonly i18n = inject(TranslationService);
  private readonly catalogService = inject(CatalogService);

  readonly services = signal<PublicService[]>([]);
  readonly selectedCategoryCode = signal('');
  readonly selectedServiceId = signal('');
  readonly selectedJaw = signal<JawSelection>('upper');
  readonly toothCount = signal(1);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);

  /** شكل الفكين مرسوم كمنحنى (Bezier) بدل خط مستقيم، محسوب مرة واحدة بس */
  readonly upperArch: ArchPoint[] = this.buildArch({ x: 40, y: 70 }, { x: 260, y: 8 }, { x: 480, y: 70 });
  readonly lowerArch: ArchPoint[] = this.buildArch({ x: 40, y: 180 }, { x: 260, y: 242 }, { x: 480, y: 180 });

  readonly categories = computed(() => {
    const seen = new Set<string>();
    const unique = this.services()
      .map(service => service.category)
      .filter(category => {
        if (seen.has(category.code)) return false;
        seen.add(category.code);
        return true;
      });

    return unique.sort(
      (a, b) => SERVICE_CATEGORY_ORDER.indexOf(a.code) - SERVICE_CATEGORY_ORDER.indexOf(b.code)
    );
  });

  readonly servicesInCategory = computed(() => {
    const categoryCode = this.selectedCategoryCode();
    return this.services().filter(service => service.category.code === categoryCode);
  });

  readonly selectedService = computed(() => {
    return this.services().find(service => service.id === this.selectedServiceId()) ?? null;
  });

  readonly pricingKind = computed<PricingKind>(() => {
    switch (this.selectedService()?.pricingMethod) {
      case PricingMethod.PerTooth:
      case PricingMethod.PerHole:
        return 'tooth';
      case PricingMethod.PerArch:
        return 'jaw';
      case PricingMethod.Quotation:
        return 'assessment';
      case PricingMethod.FixedCase:
      default:
        return 'fixed';
    }
  });

  readonly showsJawToggle = computed(() => this.pricingKind() === 'tooth' || this.pricingKind() === 'jaw');
  readonly showsToothSlider = computed(() => this.pricingKind() === 'tooth');
  readonly showsUnitBreakdown = computed(() => this.pricingKind() === 'tooth' || this.pricingKind() === 'jaw');

  readonly jawUnits = computed(() => (this.selectedJaw() === 'both' ? 2 : 1));

  readonly unitCount = computed(() => {
    if (this.pricingKind() === 'tooth') return this.toothCount() * this.jawUnits();
    if (this.pricingKind() === 'jaw') return this.jawUnits();
    return 1;
  });

  readonly totalPrice = computed(() => {
    const service = this.selectedService();
    return service && this.pricingKind() !== 'assessment' ? service.price * this.unitCount() : null;
  });

  /**
   * --- معدّل: مدة العمل بقت خاصية ثابتة للخدمة نفسها، مش بتتضرب في عدد الأسنان/الوحدات.
   * يعني خدمة مدتها 24 ساعة تفضل 24 ساعة سواء اتخار سن واحد أو 10 أسنان،
   * لأن الوقت اللي المصمم محتاجه ثابت بغض النظر عن عدد الوحدات في نفس الحالة. ---
   */
  readonly estimatedHours = computed(() => {
    const service = this.selectedService();
    return service && this.pricingKind() !== 'assessment' ? service.minimumDeliveryHours : null;
  });

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.catalogService.getServices().subscribe({
      next: services => {
        const activeServices = services
          .filter(service => service.isActive)
          .map(service => ({
            ...service,
            category: getServiceCategory(service.serviceCode),
          }));
        this.services.set(activeServices);
        this.selectInitialService(activeServices);
        this.isLoading.set(false);
      },
      error: () => {
        this.services.set([]);
        this.isLoading.set(false);
        this.hasError.set(true);
      },
    });
  }

  selectCategory(category: ServiceCategory): void {
    this.selectedCategoryCode.set(category.code);
    const firstService = this.services().find(service => service.category.code === category.code);
    this.selectedServiceId.set(firstService?.id ?? '');
    this.resetControls();
  }

  selectService(serviceId: string): void {
    this.selectedServiceId.set(serviceId);
    this.resetControls();
  }

  setJaw(jaw: JawSelection): void {
    this.selectedJaw.set(jaw);
  }

  setToothCount(count: number): void {
    this.toothCount.set(Math.max(1, Math.min(TEETH_PER_ARCH, count)));
  }

  isToothSelected(toothIndex: number): boolean {
    const kind = this.pricingKind();
    if (kind === 'jaw' || kind === 'fixed') return true;
    if (kind !== 'tooth') return false;
    return toothIndex <= this.toothCount();
  }

  serviceName(service: ServiceDto): string {
    return this.i18n.currentLang() === 'ar' ? service.nameAr : service.nameEn;
  }

  categoryName(category: ServiceCategory): string {
    return this.i18n.currentLang() === 'ar' ? category.nameAr : category.nameEn;
  }

  formatHours(hours: number | null): string {
    if (hours === null) return '—';
    const totalHours = Math.round(hours);
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    if (days === 0) return `${totalHours} ساعة`;
    if (remainingHours === 0) return `${days} يوم`;
    return `${days} يوم و${remainingHours} ساعة`;
  }

  private selectInitialService(services: PublicService[]): void {
    const firstCategory = services[0]?.category ?? OTHER_SERVICE_CATEGORY;
    this.selectedCategoryCode.set(firstCategory.code);
    this.selectedServiceId.set(services[0]?.id ?? '');
    this.resetControls();
  }

  private resetControls(): void {
    this.selectedJaw.set('upper');
    this.toothCount.set(1);
  }

  private buildArch(start: ArchPoint, control: ArchPoint, end: ArchPoint): ArchPoint[] {
    return Array.from({ length: TEETH_PER_ARCH }, (_, index) => {
      const t = (index + 0.5) / TEETH_PER_ARCH;
      const mt = 1 - t;
      return {
        x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
        y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
      };
    });
  }
}