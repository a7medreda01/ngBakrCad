import { UserRole, OrderStatus, PricingMethod, TransactionType, InvoiceStatus, TicketType, TicketStatus, ClientClassification, MeetingStatus } from '../enums';
export { UserRole, OrderStatus, PricingMethod, TransactionType, InvoiceStatus, TicketType, TicketStatus, ClientClassification, MeetingStatus };

export interface LoginRequest {
  email: string;
  password: string;
  confirmLogoutOtherDevices?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  clinicName?: string;
  country?: string;
  city?: string;
  specialization?: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  fullName: string;
  token: string;
  refreshToken: string;
  roles: string[];
  permissions: string[];
  isEmailVerified: boolean;
}

export interface RefreshTokenRequest {
  token: string;
}

export interface ClientProfileDto {
  userId: string;
  clinicName: string | null;
  country: string | null;
  city: string | null;
  creditLimit: number;
  negativeBalanceAllowed: boolean;
  classificationTag: ClientClassification;
  walletBalance: number;
  level: string;
  completedCasesCount: number;
  caseCompletionRate: number;
}

export interface DesignerProfileDto {
  userId: string;
  specialization: string | null;
  slaStats: string | null;
  rating: number;
  level: string;
  completedCasesCount: number;
  caseCompletionRate: number;
  isAvailable?: boolean;
}

export interface ServiceDto {
  id: string;
  serviceCode: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  categoryAr?: string;
  categoryEn?: string;
  pricingMethod: PricingMethod;
  price: number;
  designerProfit: number;
  minimumDeliveryHours: number;
  isActive: boolean;
  originalPrice?: number | null;   // ✅ جديد: السعر العام لو فيه سعر خاص
  hasCustomPrice?: boolean;        // ✅ جديد: علامة إن السعر ده مخصص للطبيب
}

export interface DoctorServicePricingDto {
  doctorId: string;
  serviceId: string;
  customPrice: number;
}

export interface DesignerServicePricingDto {
  designerId: string;
  serviceId: string;
  customProfit: number;
  serviceCode: string;
  serviceNameAr: string;
  serviceNameEn: string;
  catalogProfit: number;
}

export interface SetCustomProfitRequest {
  designerId: string;
  customProfit: number;
}

export interface CreateServiceRequest {
  serviceCode: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  categoryAr?: string;
  categoryEn?: string;
  pricingMethod: PricingMethod;
  price: number;
  designerProfit: number;
  minimumDeliveryHours: number;
}

export interface UpdateServiceRequest {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  categoryAr?: string;
  categoryEn?: string;
  pricingMethod: PricingMethod;
  price: number;
  designerProfit: number;
  minimumDeliveryHours: number;
  isActive: boolean;
}

export interface SetCustomPriceRequest {
  doctorId: string;
  customPrice: number;
}

export interface OrderServiceSelection {
  serviceId: string;
  teeth?: number[];
  targetType?: 'tooth' | 'upper_arch' | 'lower_arch' | 'full_case';
}

export interface OrderCreateRequest {
  patientName: string;
  patientGender: string;
  patientAge: number;
  requiredDeliveryDate: string; // ISO string
  expressChecked: boolean;
  previewRequired: boolean;
  gumDesignChecked: boolean;
  selectedTeeth: number[];
  serviceIds: string[];
  serviceSelections?: OrderServiceSelection[];
  notes?: string;
}

export interface OrderDto {
  id: string;
  orderCode: string;
  clientId: string;
  clientCode: string;
  clientName?: string | null;
  designerId: string | null;
  designerCode: string | null;
  designerName: string | null;  // Full name for admin display
  patientName: string;
  patientGender: string;
  patientAge: number;
  requiredDeliveryDate: string;
  createdAt?: string;
  status: OrderStatus;
  expressChecked: boolean;
  previewRequired: boolean;
  basePrice: number;
  expressFee: number;
  gumDesignFee: number;
  finalPrice: number;
  isPaid: boolean;
  notes: string | null;
  selectedTeeth: number[];
  services: OrderServiceDto[];
  files: FileMetadataDto[];
  slaTracking: OrderSlaTrackingDto | null;
}

export interface OrderServiceDto {
  serviceId: string;
  nameEn: string;
  nameAr: string;
  priceCharged: number;
  quantity: number;
  subtotal: number;
  teeth?: number[];
}

export interface OrderReviewRequest {
  status: OrderStatus;
  notes: string;
  sendPreview?: boolean;
}

export interface RedoRequest {
  isPaid: boolean;
  extraAmount: number;
  notes: string;
}

export interface OrderSlaTrackingDto {
  startedAt: string | null;
  pausedAt: string | null;
  totalPausedMinutes: number;
  dueAt: string | null;
  completedAt: string | null;
  isBreached: boolean;
}

export interface FileMetadataDto {
  id: string;
  category: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  expiringUrlToken?: string | null;
  threeJsMetadata?: string | null;
  isExternalLink: boolean;
  externalUrl?: string | null;
}
export interface DepositPackageDto {
  id: string;
  nameAr: string;
  nameEn: string;
  paymentAmount: number;
  walletCreditAmount: number;
  isActive: boolean;
}

export interface WalletDto {
  userId: string;
  balance: number;
}

export interface WalletTransactionDto {
  id: string;
  amount: number;
  type: TransactionType;
  beforeBalance: number;
  afterBalance: number;
  referenceId: string | null;
  notes: string;
  createdAt: string;
}

export interface BalanceAdjustmentRequest {
  amount: number;
  type: TransactionType;
  notes: string;
}

export interface CreditLimitUpdateRequest {
  creditLimit: number;
  negativeBalanceAllowed: boolean;
}

export interface InvoiceDto {
  id: string;
  invoiceCode: string;
  orderId: string | null;
  clientId: string;
  amount: number;
  status: InvoiceStatus;
  isRevisionInvoice: boolean;
  notes: string;
}

export interface PaymentIntentRequest {
  invoiceId: string;
}

export interface ScheduleMeetingRequest {
  orderId: string;
  proposedTime: string;
  reason: string;
}

export interface MeetingRequestDto {
  id: string;
  orderId: string;
  orderCode: string;
  labId: string;
  labCode: string;
  proposedTime: string;
  status: MeetingStatus;
  reason: string;
  meeting?: MeetingDto | null;
  requestedByUserId: string;
}

export interface MeetingDto {
  meetingRequestId: string;
  zoomMeetingId: string;
  clientJoinUrl: string;
  designerJoinUrl: string;
  startUrl: string;
  scheduledAt: string;
}

export interface CreateTicketRequest {
  title: string;
  category: TicketType;
  initialMessage: string;
}

export interface AddMessageRequest {
  messageBody: string;
}

export interface SupportTicketDto {
  id: string;
  ticketCode: string;
  userId: string;
  title: string;
  category: TicketType;
  status: TicketStatus;
  createdAt: string;
}

export interface SupportMessageDto {
  id: string;
  senderUserId: string;
  senderCode: string;
  messageBody: string;
  attachmentPath: string | null;
  createdAt: string;
}

export interface FaqDto {
  id: string;
  category: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
}

export interface AuditLogDto {
  id: string;
  tableName: string;
  entityId: string;
  actionType: string;
  beforeValues: string | null;
  afterValues: string | null;
  userId: string | null;
  ipAddress: string;
  timestamp: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface AddEmployeeRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
}

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber: string;
  clinicName?: string;
  country?: string;
  city?: string;
  specialization?: string;
}

export interface UserProfileDto {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  isActive: boolean;
  isEmailVerified: boolean;
  roles: string[];
  profilePictureUrl?: string | null;
  clientProfile: ClientProfileDto | null;
  designerProfile: DesignerProfileDto | null;
}

export interface DesignerDashboardDto {
  designerId: string;
  fullName: string;
  specialization: string | null;
  rating: number;
  level: string;
  totalCompletedOrders: number;
  activeOrders: number;
  pendingReviewOrders: number;
  totalEarned: number;
  withdrawableBalance: number;
  pendingBalance: number;
  deferredBalance: number;
}

export interface DesignerBillingDto {
  id: string;
  orderId: string;
  orderCode: string;
  amountEarned: number;
  isEligible: boolean;
  payoutStatus: string;
  payoutRequestCount: number;
  createdAt: string;
}

export interface UpdateDesignerProfileRequest {
  fullName: string;
  phoneNumber: string;
  specialization?: string;
}


// core/models/order-status-workflow.ts
//
// Mirrors AppBL/Service/OrderService.cs exactly:
//   - OrderStatus enum order (index = C# enum value, sent/received as a number over the API)
//   - IsValidTransition(...) switch statement → TRANSITIONS map below
//   - pauseStatuses list in UpdateOrderStatusAsync → PAUSED_STATUSES
//
// Two transitions are intentionally NOT in TRANSITIONS because the backend
// doesn't reach them through PUT /Orders/{id}/status:
//   - PendingAdminReview -> AssignedToLab   → happens via PUT /Orders/{id}/assign/{designerId}
//   - DoctorRevisionRequested -> InDesign   → happens via POST /Orders/{id}/redo
// Both have their own dedicated UI actions instead (see components).

export interface StatusMeta {
  label: string;
  badge: string;
  dot: string;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  [OrderStatus.Draft]: { label: 'مسودة', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  [OrderStatus.PendingAdminReview]: { label: 'مراجعة الإدارة', badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  [OrderStatus.AssignedToLab]: { label: 'تم الإسناد للمصمم', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  [OrderStatus.LabReview]: { label: 'مراجعة المصمم للحالة', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  [OrderStatus.LabRejected]: { label: 'رفض المصمم للحالة', badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  [OrderStatus.LabAccepted]: { label: 'قبل المصمم الحالة', badge: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500' },
  [OrderStatus.WaitingClientReview]: { label: 'معاينة عند العميل', badge: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  [OrderStatus.WaitingDoctorResponse]: { label: 'بانتظار رد الطبيب', badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  [OrderStatus.WaitingLabResponse]: { label: 'بانتظار رد المصمم', badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  [OrderStatus.WaitingAdminResponse]: { label: 'بانتظار رد الإدارة', badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  [OrderStatus.InDesign]: { label: 'قيد التصميم', badge: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  [OrderStatus.QualityReview]: { label: 'مراجعة الجودة', badge: 'bg-cyan-50 text-cyan-700', dot: 'bg-cyan-500' },
  [OrderStatus.ReturnedToDesigner]: { label: 'مرتجع للمصمم', badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  [OrderStatus.RejectedByQuality]: { label: 'رفض الجودة', badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  [OrderStatus.ApprovedByQuality]: { label: 'قبول الجودة', badge: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  [OrderStatus.DoctorReview]: { label: 'مراجعة الطبيب', badge: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  [OrderStatus.DoctorRevisionRequested]: { label: 'طلب تعديل من الطبيب', badge: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  [OrderStatus.ReadyForDownload]: { label: 'جاهز للتحميل', badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  [OrderStatus.Completed]: { label: 'مكتمل', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  [OrderStatus.Cancelled]: { label: 'ملغي', badge: 'bg-slate-200 text-slate-700', dot: 'bg-slate-500' },
  // ← جديد
  [OrderStatus.WaitingClientResponse]: { label: 'ملف ناقص - بانتظار العميل', badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
};

export function statusLabel(status: OrderStatus): string {
  return STATUS_META[status]?.label ?? 'غير معروف';
}

export interface StatusAction {
  next: OrderStatus;
  label: string;
  style: 'primary' | 'success' | 'danger' | 'neutral';
  requiresNotes?: boolean;
  requiresPreview?: boolean;
  /** يفرض إن العميل يرفع ملف قبل ما الزرار يتفعّل (خاص بـ WaitingClientResponse) */
  requiresFile?: boolean;
}

const TRANSITIONS: Partial<Record<OrderStatus, StatusAction[]>> = {
  [OrderStatus.Draft]: [
    { next: OrderStatus.PendingAdminReview, label: 'إرسال لمراجعة الإدارة', style: 'primary' },
  ],
  [OrderStatus.PendingAdminReview]: [
    { next: OrderStatus.Cancelled, label: 'إلغاء الطلب', style: 'danger', requiresNotes: true },
  ],
  [OrderStatus.AssignedToLab]: [
    { next: OrderStatus.LabReview, label: 'بدء مراجعة المصمم', style: 'primary' },
  ],
  [OrderStatus.LabReview]: [
    { next: OrderStatus.LabAccepted, label: 'قبول المصمم للحالة', style: 'success' },
    { next: OrderStatus.LabRejected, label: 'رفض المصمم للحالة', style: 'danger', requiresNotes: true },
  ],
  [OrderStatus.LabAccepted]: [
    { next: OrderStatus.InDesign, label: 'بدء التصميم', style: 'primary' },
  ],
  [OrderStatus.InDesign]: [
    { next: OrderStatus.QualityReview, label: 'إرسال لمراجعة الجودة', style: 'primary' },
    { next: OrderStatus.WaitingAdminResponse, label: 'طلب رد من الإدارة', style: 'neutral', requiresNotes: true },
  ],


  // ← جديد: العميل يرفع الملف الناقص ثم يبعته للإدارة
  [OrderStatus.WaitingClientResponse]: [
    { next: OrderStatus.WaitingAdminResponse, label: 'إرسال الملف للإدارة', style: 'primary', requiresFile: true },
  ],

  [OrderStatus.QualityReview]: [
    { next: OrderStatus.ApprovedByQuality, label: 'قبول الجودة', style: 'success', requiresPreview: true },
    { next: OrderStatus.ReturnedToDesigner, label: 'إرجاع للمصمم للتعديل', style: 'neutral', requiresNotes: true },
    { next: OrderStatus.RejectedByQuality, label: 'رفض الجودة', style: 'danger', requiresNotes: true },
  ],
  [OrderStatus.ReturnedToDesigner]: [
    { next: OrderStatus.InDesign, label: 'إعادة للتصميم', style: 'primary' },
  ],
  [OrderStatus.ApprovedByQuality]: [
    { next: OrderStatus.DoctorReview, label: 'إرسال لمراجعة الطبيب', style: 'primary' },
    { next: OrderStatus.WaitingClientReview, label: 'إرسال معاينة للعميل', style: 'primary' },
  ],
  [OrderStatus.WaitingClientReview]: [
    { next: OrderStatus.ReadyForDownload, label: 'موافقة العميل على المعاينة', style: 'success' },
    { next: OrderStatus.DoctorRevisionRequested, label: 'طلب تعديل من العميل', style: 'danger', requiresNotes: true },
  ],
  [OrderStatus.DoctorReview]: [
    { next: OrderStatus.ReadyForDownload, label: 'موافقة الطبيب', style: 'success' },
    { next: OrderStatus.DoctorRevisionRequested, label: 'طلب تعديل من الطبيب', style: 'danger', requiresNotes: true },
  ],
  [OrderStatus.ReadyForDownload]: [
    { next: OrderStatus.Completed, label: 'إغلاق الطلب كمكتمل', style: 'success' },
  ],
  [OrderStatus.WaitingAdminResponse]: [
    { next: OrderStatus.InDesign, label: 'الرد وإعادة الطلب للتصميم', style: 'primary', requiresNotes: true },
    { next: OrderStatus.ReturnedToDesigner, label: 'الموافقة وإرجاع الطلب للمصمم', style: 'success' },
    // ── جديد ──
    { next: OrderStatus.WaitingClientResponse, label: 'طلب ملف ناقص من العميل', style: 'neutral', requiresNotes: true },
    { next: OrderStatus.Cancelled, label: 'إلغاء الطلب', style: 'danger', requiresNotes: true },
  ],
};

export function getStatusActions(current: OrderStatus): StatusAction[] {
  return TRANSITIONS[current] ?? [];
}

export const STUCK_STATUSES = new Set<OrderStatus>([
  OrderStatus.LabRejected,
  OrderStatus.RejectedByQuality,
]);

/** Matches the pauseStatuses list inside UpdateOrderStatusAsync (SLA clock is paused). */
export const PAUSED_STATUSES = new Set<OrderStatus>([
  OrderStatus.WaitingDoctorResponse,
  OrderStatus.WaitingLabResponse,
  OrderStatus.WaitingAdminResponse,
  OrderStatus.WaitingClientResponse, // ← جديد
  OrderStatus.QualityReview,
  OrderStatus.DoctorReview,
  OrderStatus.WaitingClientReview,
  OrderStatus.ApprovedByQuality,
]);

export interface OrderStatusHistoryDto {
  id: string;
  orderId: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  changedByUserId: string;
  reason: string;
  notes: string;
  createdAt: string;
}
export interface PagedResultDto<T> {
  items: T[];
  totalCount?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface SupportTicketListDto {
  publicId: string;
  ticketCode: string;
  title: string;
  category: TicketType;
  senderName: string;
  receiverName: string;
  unreadForSenderCount: number;
  unreadForReceiverCount: number;
  lastMessage: string | null;
  lastMessageDate: string | null;
  status: TicketStatus;
  createdAt: string;
}

export interface UnreadCountDto {
  totalUnread: number;
}

export interface EmployeeDto {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  isActive: boolean;
  isEmailVerified: boolean;
  role: string;
  permissions: string[];
  createdAt: string;
}

export interface UpdateEmployeeRoleRequest {
  role: UserRole;
}

export interface RolePermissionsSummaryDto {
  roleName: string;
  permissions: string[];
}