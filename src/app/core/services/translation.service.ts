import { Injectable, signal, computed } from '@angular/core';

export type Lang = 'ar' | 'en';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  readonly currentLang = signal<Lang>('ar');

  constructor() {
    this.applyDocumentLanguage(this.currentLang());
  }

  private readonly translations: Record<Lang, Record<string, string>> = {
    ar: {
      'app.title': 'BKR CAD - مركز تصميم الأسنان الرقمي',
      'auth.login': 'تسجيل الدخول',
      'auth.register': 'إنشاء حساب جديد',
      'auth.email': 'البريد الإلكتروني',
      'auth.password': 'كلمة المرور',
      'auth.fullname': 'الاسم الكامل',
      'auth.phone': 'رقم الجوال',
      'auth.role': 'نوع الحساب',
      'auth.clinicName': 'اسم العيادة / المركز',
      'auth.country': 'الدولة',
      'auth.city': 'المدينة',
      'auth.specialization': 'التخصص (اختياري)',
      'auth.registerAsDoctor': 'سجل كعميل (طبيب / معمل)',
      'auth.registerAsLab': 'انضم ككادر تصميم (معمل)',
      'auth.noAccount': 'ليس لديك حساب؟ سجل الآن',
      'auth.hasAccount': 'لديك حساب بالفعل؟ سجل دخولك',
      'auth.forgot': 'نسيت كلمة المرور؟',
      'auth.reset': 'إعادة تعيين كلمة المرور',
      'auth.logout': 'تسجيل الخروج',
      
      'portal.client': 'بوابة الطبيب / العميل',
      'portal.lab': 'بوابة المعمل المصمم',
      'portal.admin': 'لوحة تحكم المشرفين',
      
      'nav.dashboard': 'الرئيسية',
      'nav.createOrder': 'طلب جديد',
      'nav.orders': 'الطلبات',
      'nav.wallet': 'المحفظة',
      'nav.support': 'الدعم الفني',
      'nav.settings': 'الإعدادات',
      'nav.users': 'المستخدمين',
      'nav.services': 'الخدمات والأسعار',
      'nav.packages': 'باقات الشحن',
      'nav.invoices': 'الفواتير',
      'nav.meetings': 'الاجتماعات الاستشارية',
      'nav.auditLogs': 'سجلات النظام',
      
      'dashboard.activeOrders': 'الطلبات النشطة',
      'dashboard.pending': 'في انتظار المراجعة',
      'dashboard.inDesign': 'قيد التصميم',
      'dashboard.completed': 'المكتملة',
      'dashboard.walletBalance': 'رصيد المحفظة',
      'dashboard.recentNotifications': 'آخر الإشعارات',
      'dashboard.slaWarnings': 'تنبيهات SLA',
      'dashboard.totalRevenue': 'إجمالي الإيرادات',
      'dashboard.activeDesigners': 'المصممين النشطين',
      'dashboard.activeClinics': 'العيادات النشطة',
      
      'order.patientName': 'اسم المريض',
      'order.patientGender': 'جنس المريض',
      'order.patientAge': 'عمر المريض',
      'order.deliveryDate': 'تاريخ التسليم المطلوب',
      'order.express': 'طلب مستعجل (نصف الوقت و +50% رسوم إضافية)',
      'order.preview': 'طلب معاينة التصميم ثلاثي الأبعاد قبل الاعتماد',
      'order.gumDesign': 'إضافة تصميم اللثة (Pink Esthetics)',
      'order.selectedTeeth': 'الأسنان المختارة',
      'order.services': 'الخدمات المطلوبة',
      'order.notes': 'ملاحظات إضافية',
      'order.pricePreview': 'معاينة التكلفة',
      'order.basePrice': 'السعر الأساسي',
      'order.expressFee': 'رسوم الاستعجال',
      'order.gumFee': 'رسوم تصميم اللثة',
      'order.finalPrice': 'السعر الإجمالي',
      'order.submit': 'إرسال طلب التصميم',
      'order.dragDrop': 'اسحب وأفلت ملفات الـ STL/OBJ/CBCT هنا أو اضغط للاختيار',
      
      'wallet.transactions': 'العمليات السابقة',
      'wallet.topup': 'شحن الرصيد',
      'wallet.packages': 'باقات الرصيد المتاحة',
      'wallet.creditLimit': 'الحد الائتماني',
      'wallet.negativeAllowed': 'السماح بالرصيد السالب',
      
      'odontogram.upper': 'الفك العلوي',
      'odontogram.lower': 'الفك السفلي',
      
      'viewer.title': 'المستعرض ثلاثي الأبعاد CAD Viewer',
      'viewer.wireframe': 'عرض شبكي Wireframe',
      'viewer.reset': 'إعادة ضبط الكاميرا',
      'viewer.measure': 'قياس الأبعاد',
      'viewer.fullscreen': 'ملء الشاشة',
      
      'common.save': 'حفظ',
      'common.cancel': 'إلغاء',
      'common.delete': 'حذف',
      'common.edit': 'تعديل',
      'common.approve': 'اعتماد / موافقة',
      'common.reject': 'رفض',
      'common.view': 'عرض',
      'common.status': 'الحالة',
      'common.date': 'التاريخ',
      'common.action': 'الإجراء'
    },
    en: {
      'app.title': 'BKR CAD - Digital Dental Design Center',
      'auth.login': 'Log In',
      'auth.register': 'Create Account',
      'auth.email': 'Email Address',
      'auth.password': 'Password',
      'auth.fullname': 'Full Name',
      'auth.phone': 'Phone Number',
      'auth.role': 'Account Type',
      'auth.clinicName': 'Clinic / Center Name',
      'auth.country': 'Country',
      'auth.city': 'City',
      'auth.specialization': 'Specialization (Optional)',
      'auth.registerAsDoctor': 'Register as Client (Doctor/Lab)',
      'auth.registerAsLab': 'Join as Design Center (Lab)',
      'auth.noAccount': "Don't have an account? Register now",
      'auth.hasAccount': 'Already have an account? Log In',
      'auth.forgot': 'Forgot Password?',
      'auth.reset': 'Reset Password',
      'auth.logout': 'Logout',
      
      'portal.client': 'Doctor / Client Portal',
      'portal.lab': 'Lab Design Portal',
      'portal.admin': 'Admin Control Console',
      
      'nav.dashboard': 'Dashboard',
      'nav.createOrder': 'New Request',
      'nav.orders': 'Orders',
      'nav.wallet': 'Wallet',
      'nav.support': 'Support',
      'nav.settings': 'Settings',
      'nav.users': 'Users',
      'nav.services': 'Services & Pricing',
      'nav.packages': 'Deposit Packages',
      'nav.invoices': 'Invoices',
      'nav.meetings': 'Consultations',
      'nav.auditLogs': 'Audit Logs',
      
      'dashboard.activeOrders': 'Active Orders',
      'dashboard.pending': 'Pending Review',
      'dashboard.inDesign': 'In Design',
      'dashboard.completed': 'Completed',
      'dashboard.walletBalance': 'Wallet Balance',
      'dashboard.recentNotifications': 'Recent Notifications',
      'dashboard.slaWarnings': 'SLA Warnings',
      'dashboard.totalRevenue': 'Total Revenue',
      'dashboard.activeDesigners': 'Active Designers',
      'dashboard.activeClinics': 'Active Clinics',
      
      'order.patientName': 'Patient Name',
      'order.patientGender': 'Patient Gender',
      'order.patientAge': 'Patient Age',
      'order.deliveryDate': 'Required Delivery Date',
      'order.express': 'Half-Time Express Order (SLA is cut in half, +50% fee)',
      'order.preview': 'Request 3D preview for clinical approval before completion',
      'order.gumDesign': 'Include Pink Esthetics (Gum design surcharge)',
      'order.selectedTeeth': 'Selected Teeth',
      'order.services': 'Required Services',
      'order.notes': 'Clinical Notes',
      'order.pricePreview': 'Cost Summary',
      'order.basePrice': 'Base Price',
      'order.expressFee': 'Express Fee',
      'order.gumFee': 'Gum Design Fee',
      'order.finalPrice': 'Final Price',
      'order.submit': 'Submit Case',
      'order.dragDrop': 'Drag & drop STL/OBJ/CBCT files here, or click to browse',
      
      'wallet.transactions': 'Transactions Log',
      'wallet.topup': 'Recharge Wallet',
      'wallet.packages': 'Available Recharge Packages',
      'wallet.creditLimit': 'Credit Limit',
      'wallet.negativeAllowed': 'Negative Balance Allowed',
      
      'odontogram.upper': 'Upper Arch',
      'odontogram.lower': 'Lower Arch',
      
      'viewer.title': '3D CAD Web Viewer',
      'viewer.wireframe': 'Wireframe mode',
      'viewer.reset': 'Reset View',
      'viewer.measure': 'Measure Distance',
      'viewer.fullscreen': 'Fullscreen',
      
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.approve': 'Approve Case',
      'common.reject': 'Reject Case',
      'common.view': 'View',
      'common.status': 'Status',
      'common.date': 'Date',
      'common.action': 'Action'
    }
  };

  readonly isRtl = computed(() => this.currentLang() === 'ar');

  toggleLanguage(): void {
    const newLang: Lang = this.currentLang() === 'ar' ? 'en' : 'ar';
    this.currentLang.set(newLang);
    this.applyDocumentLanguage(newLang);
  }

  private applyDocumentLanguage(lang: Lang): void {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }

  translate(key: string): string {
    const lang = this.currentLang();
    return this.translations[lang]?.[key] || key;
  }
}
