export enum UserRole {
  SuperAdmin = 0,
  FinancialAdmin = 1,
  OperationsAdmin = 2,
  QualityAdmin = 3,
  Doctor = 4,
  Lab = 5,
  Designer = 6
}

export enum OrderStatus {
  Draft = 0,
  PendingAdminReview = 1,
  AssignedToLab = 2,
  LabReview = 3,
  LabRejected = 4,
  LabAccepted = 5,
  WaitingClientReview = 6,
  WaitingDoctorResponse = 7,
  WaitingLabResponse = 8,
  WaitingAdminResponse = 9,
  InDesign = 10,
  QualityReview = 11,
  ReturnedToDesigner = 12,
  RejectedByQuality = 13,
  ApprovedByQuality = 14,
  DoctorReview = 15,
  DoctorRevisionRequested = 16,
  ReadyForDownload = 17,
  Completed = 18,
  Cancelled = 19,
  WaitingClientResponse=20
}

export enum PricingMethod {
  PerTooth = 'PerTooth',
  PerArch = 'PerArch',
  PerHole = 'PerHole',
  FixedCase = 'FixedCase',
  Quotation = 'Quotation'
}

export enum TransactionType {
  Deposit = 0,
  Bonus = 1,
  OrderPayment = 2,
  Refund = 3,
  ManualAdjustment = 4,
  CreditUsage = 5,
  CreditSettlement = 6
}

export enum InvoiceStatus {
  Pending = 0,
  Paid = 1,
  Failed = 2,
  Cancelled = 3
}

export enum TicketType {
  Complaint = 0,
  Suggestion = 1,
  Inquiry = 2
}

export enum TicketStatus {
  Open = 0,
  InProgress = 1,
  Resolved = 2,
  Closed = 3
}

export enum ClientClassification {
  MonthlySubscriber = 0,
  PrepaidPackages = 1,
  PayPerCase = 2
}

export enum MeetingStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2
}
