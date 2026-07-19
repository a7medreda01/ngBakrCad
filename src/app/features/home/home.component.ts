import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  readonly authService = inject(AuthService);
  readonly router = inject(Router);

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
  readonly stats = [
    { value: '4,820+', label: 'حالة تم تسليمها' },
    { value: '2.5 س', label: 'متوسط وقت التسليم' },
    { value: '99.8%', label: 'نسبة قبول الجودة' },
    { value: '350+', label: 'عيادة ومختبر شريك' },
  ];

  readonly features = [
    {
      icon: 'bi-hospital',
      color: 'bg-primary-50 text-primary border-primary-100',
      title: 'عيادات ومختبرات الأسنان',
      description: 'أرسل ملفات STL و OBJ بسهولة، وتابع حالة التصميم من الرفع حتى الإنتاج.',
      items: ['رفع ملفات آمن وسريع', 'تتبع مرحلة التصميم', 'تواصل مباشر مع المصمم'],
      cta: 'بوابة العيادات',
      link: '/auth/login',
    },
    {
      icon: 'bi-pencil-square',
      color: 'bg-accent/10 text-accent-dark border-accent/20',
      title: 'مصممو CAD المحترفون',
      description: 'مساحة عمل منظمة مع أدوات تصميم متقدمة ومعاينة ثلاثية الأبعاد فورية.',
      items: ['مساحة عمل مرنة', 'معاينة 3D تفاعلية', 'تقارير جودة دقيقة'],
      cta: 'لوحة المصممين',
      link: '/auth/login',
    },
    {
      icon: 'bi-shield-check',
      color: 'bg-success-light text-success-dark border-success/20',
      title: 'إدارة الجودة والإشراف',
      description: 'راقب كل حالة بدقة ووافق على التصميمات قبل التسليم النهائي.',
      items: ['تقييم جودة شامل', 'متابعة لحظية', 'تقرير مراجعة مفصل'],
      cta: 'لوحة الجودة',
      link: '/auth/login',
    },
  ];

  readonly workflow = [
    {
      step: '01',
      icon: 'bi-cloud-arrow-up',
      title: 'رفع الحالة',
      description: 'ترفع العيادة ملفات المريض والتفاصيل السريرية عبر بوابة آمنة.',
    },
    {
      step: '02',
      icon: 'bi-cpu',
      title: 'التوجيه الذكي',
      description: 'النظام يوجّه الحالة تلقائياً إلى المصمم الأنسب حسب التخصص والحمل.',
    },
    {
      step: '03',
      icon: 'bi-box',
      title: 'التصميم CAD',
      description: 'المصمم ينفّذ التصميم الرقمي مع معاينة ثلاثية الأبعاد ومراجعات فورية.',
    },
    {
      step: '04',
      icon: 'bi-clipboard2-check',
      title: 'مراجعة الجودة',
      description: 'فريق الجودة يراجع الدقة والمطابقة للمعايير قبل الموافقة.',
    },
    {
      step: '05',
      icon: 'bi-file-earmark-arrow-down',
      title: 'تسليم STL',
      description: 'تسليم ملفات جاهزة للتصنيع مع سجل كامل لكل مرحلة.',
    },
  ];

  readonly testimonials = [
    {
      quote: 'منذ استخدام BKR CAD، انخفض وقت تسليم التركيبات بنسبة 40%. التواصل مع المصممين أصبح سلساً جداً.',
      name: 'د. أحمد الشمري',
      role: 'عيادة أسنان — الرياض',
      avatar: 'أ',
    },
    {
      quote: 'المنصة وفّرت لي مساحة عمل منظمة وأدوات مراجعة 3D ممتازة. جودة التصميمات ارتفعت بشكل ملحوظ.',
      name: 'سارة العتيبي',
      role: 'مصممة CAD — جدة',
      avatar: 'س',
    },
    {
      quote: 'نظام مراقبة الجودة المتكامل يسمح لنا بضمان دقة كل تصميم قبل التسليم. أداة لا غنى عنها.',
      name: 'م. خالد الدوسري',
      role: 'مدير جودة — الدمام',
      avatar: 'خ',
    },
  ];
}
