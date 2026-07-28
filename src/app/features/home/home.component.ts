import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';
import { ServicesMapComponent } from '../../shared/components/services-map/services-map.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ServicesMapComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  readonly i18n = inject(TranslationService);
  readonly animatedStats = signal([0, 0, 0, 0]);
  private animationFrameId?: number;

  get isLoggedIn(): boolean {
    return this.authService.currentUser() !== null;
  }

  get dashboardLink(): string {
    const roles = this.authService.currentUser()?.roles || [];
    if (roles.some(r => ['SuperAdmin', 'FinancialAdmin', 'OperationsAdmin', 'QualityAdmin'].includes(r))) {
      return '/admin/dashboard';
    } else if (roles.includes('Designer')) {
      return '/lab/dashboard';
    }
    return '/client/dashboard';
  }

  logout(): void {
    this.authService.logout();
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }

  readonly stats = [
    { target: 4820, decimals: 0, suffix: '+', label: 'home.deliveredCases' },
    { target:45, decimals: 0, suffix: 'home.hoursShort', label: 'home.averageDelivery' },
    { target: 99.8, decimals: 1, suffix: '%', label: 'home.qualityRate' },
    { target: 350, decimals: 0, suffix: '+', label: 'home.partnerClinics' },
  ];

  ngOnInit(): void {
    const startTime = performance.now();
    const duration = 1400;

    const animate = (timestamp: number) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      this.animatedStats.set(this.stats.map(stat => stat.target * easedProgress));

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  formatStat(index: number): string {
    const stat = this.stats[index];
    const suffix = stat.suffix.startsWith('home.') ? this.t(stat.suffix) : stat.suffix;
    return `${this.animatedStats()[index].toLocaleString('en-US', {
      minimumFractionDigits: stat.decimals,
      maximumFractionDigits: stat.decimals
    })}${suffix}`;
  }

  readonly features = [
    {
      icon: 'bi-hospital',
      color: 'bg-primary-50 text-primary border-primary-100',
      title: 'home.clinicsLabs',
      description: 'home.clinicsLabsDesc',
      items: ['home.secureUpload', 'home.designTracking', 'home.directDesignerContact'],
      cta: 'home.clinicsLabs',
      link: '/auth/login',
    },
    {
      icon: 'bi-pencil-square',
      color: 'bg-accent/10 text-accent-dark border-accent/20',
      title: 'home.professionalDesigners',
      description: 'home.professionalDesignersDesc',
      items: ['home.flexibleWorkspace', 'home.interactive3d', 'home.qualityReports'],
      cta: 'home.professionalDesigners',
      link: '/auth/login',
    },
    {
      icon: 'bi-shield-check',
      color: 'bg-success-light text-success-dark border-success/20',
      title: 'home.qualitySupervision',
      description: 'home.qualitySupervisionDesc',
      items: ['home.qualityEvaluation', 'home.realtimeTracking', 'home.detailedReview'],
      cta: 'home.qualitySupervision',
      link: '/auth/login',
    },
  ];

  // Workflow reduced to 4 steps (previously 5). "Smart Routing" step was removed
  // because it implied the case gets matched/routed to an external designer,
  // which conflicts with positioning BKR CAD as the single entity executing
  // the work end-to-end rather than a clinic<->designer matchmaking platform.
  readonly workflow = [
    {
      step: '01',
      icon: 'bi-cloud-arrow-up',
      title: 'home.uploadCase',
      description: 'home.uploadCaseDesc',
    },
    {
      step: '02',
      icon: 'bi-box',
      title: 'home.cadDesign',
      description: 'home.cadDesignDesc',
    },
    {
      step: '03',
      icon: 'bi-clipboard2-check',
      title: 'home.qualityReview',
      description: 'home.qualityReviewDesc',
    },
    {
      step: '04',
      icon: 'bi-file-earmark-arrow-down',
      title: 'home.stlDelivery',
      description: 'home.stlDeliveryDesc',
    },
  ];

  readonly testimonials = [
    {
      quote: 'home.testimonial1',
      name: 'د. أحمد الشمري',
      role: 'home.testimonial1Role',
      avatar: 'أ',
    },
    {
      quote: 'home.testimonial2',
      name: 'سارة العتيبي',
      role: 'home.testimonial2Role',
      avatar: 'س',
    },
    {
      quote: 'home.testimonial3',
      name: 'م. خالد الدوسري',
      role: 'home.testimonial3Role',
      avatar: 'خ',
    },
  ];
}