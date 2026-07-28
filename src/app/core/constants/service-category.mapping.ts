// service-category.mapping.ts
export interface ServiceCategory {
  code: string;
  nameAr: string;
  nameEn: string;
}

export const SERVICE_CATEGORY_MAP: Readonly<Record<string, ServiceCategory>> = {
  A: { code: 'A', nameAr: 'تركيبات ثابتة', nameEn: 'Fixed Restorations' },
  B: { code: 'B', nameAr: 'زراعة الأسنان', nameEn: 'Implants' },
  C: { code: 'C', nameAr: 'تركيبات متحركة', nameEn: 'Removable' },
  D: { code: 'D', nameAr: 'أجهزة وقائية', nameEn: 'Preventive Appliances' },
  E: { code: 'E', nameAr: 'أدلة جراحية', nameEn: 'Surgical Guides' },
  F: { code: 'F', nameAr: 'All-on-x', nameEn: 'All-on-x' },
  G: { code: 'G', nameAr: 'خدمات تكميلية', nameEn: 'Add-on Services' },
} as const;

export const OTHER_SERVICE_CATEGORY: ServiceCategory = {
  code: 'OTHER',
  nameAr: 'أخرى',
  nameEn: 'Other',
};

/** يحدد ترتيب ظهور التصنيفات في الواجهة بشكل ثابت، بدل ترتيب استجابة الـ API */
export const SERVICE_CATEGORY_ORDER: readonly string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'OTHER'];

export function getServiceCategory(serviceCode: string): ServiceCategory {
  const key = serviceCode.trim().charAt(0).toUpperCase();
  return SERVICE_CATEGORY_MAP[key] ?? OTHER_SERVICE_CATEGORY;
}