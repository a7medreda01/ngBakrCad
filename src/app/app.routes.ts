import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { guestGuard } from './core/guards/guest.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  // ─── Public: Auth ────────────────────────────────────────────────────────
  {
    path: 'auth',
    loadComponent: () => import('./core/layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    canActivate: [guestGuard],
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login',    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: 'verify-email', loadComponent: () => import('./features/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent) },
      { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
    ]
  },

  // ─── Client Portal (Doctor + Lab roles share layout) ─────────────────────
  {
    path: 'client',
    loadComponent: () => import('./core/layouts/client-layout/client-layout.component').then(m => m.ClientLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['Doctor', 'Lab', 'Designer'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',    loadComponent: () => import('./features/client/dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent) },
      { path: 'orders',       loadComponent: () => import('./features/client/orders/order-list.component').then(m => m.OrderListComponent) },
      { path: 'orders/:id',   loadComponent: () => import('./features/client/order-detail/order-detail.component').then(m => m.OrderDetailComponent) },
      { path: 'create-order', loadComponent: () => import('./features/client/create-order/create-order.component').then(m => m.CreateOrderComponent) },
      { path: 'wallet',       loadComponent: () => import('./features/client/wallet/wallet.component').then(m => m.WalletComponent) },
      { path: 'profile',      loadComponent: () => import('./features/client/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'meetings',     loadComponent: () => import('./features/admin/meetings/meetings.component').then(m => m.MeetingsComponent) },
      { path: 'support',      loadComponent: () => import('./features/support/support.component').then(m => m.SupportComponent) },
    ]
  },

  // ─── Designer/Lab Portal (Designer role) ─────────────────────────────────
  {
    path: 'lab',
    loadComponent: () => import('./core/layouts/lab-layout/lab-layout.component').then(m => m.LabLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['Designer'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/lab/dashboard/lab-dashboard.component').then(m => m.LabDashboardComponent) },
      { path: 'cases',     loadComponent: () => import('./features/lab/cases/lab-cases.component').then(m => m.LabCasesComponent) },
      { path: 'cases/:id', loadComponent: () => import('./features/lab/case-detail/lab-case-detail.component').then(m => m.LabCaseDetailComponent) },
      { path: 'financials',loadComponent: () => import('./features/lab/financials/lab-financials.component').then(m => m.LabFinancialsComponent) },
      { path: 'meetings',  loadComponent: () => import('./features/admin/meetings/meetings.component').then(m => m.MeetingsComponent) },
      { path: 'profile',   loadComponent: () => import('./features/client/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'support',   loadComponent: () => import('./features/support/support.component').then(m => m.SupportComponent) },
    ]
  },

  // ─── Admin Portal ─────────────────────────────────────────────────────────
  {
    path: 'admin',
    loadComponent: () => import('./core/layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['SuperAdmin', 'FinancialAdmin', 'OperationsAdmin', 'QualityAdmin'] },
    children: [
      { path: '', redirectTo: 'analytics', pathMatch: 'full' },
      { path: 'analytics',     loadComponent: () => import('./features/admin/analytics/analytics.component').then(m => m.AnalyticsComponent) },
      { path: 'dashboard',     redirectTo: 'analytics', pathMatch: 'full' },
      { path: 'employees',     loadComponent: () => import('./features/admin/employees/employees.component').then(m => m.EmployeesComponent), canActivate: [permissionGuard], data: { requiredPermission: 'ManageUsers' } },
      { path: 'users',         loadComponent: () => import('./features/admin/users/users.component').then(m => m.UsersComponent), canActivate: [permissionGuard], data: { requiredPermission: 'ManageUsers' } },
      { path: 'orders',        loadComponent: () => import('./features/admin/orders/admin-orders.component').then(m => m.AdminOrdersComponent) },
      { path: 'orders/:id',   loadComponent: () => import('./features/admin/order details/app-admin-order-detail').then(m => m.AdminOrderDetailComponent) },
      { path: 'services',      loadComponent: () => import('./features/admin/services/services.component').then(m => m.ServicesComponent), canActivate: [permissionGuard], data: { requiredPermission: 'ManageServices' } },
      { path: 'custom-pricing', loadComponent: () => import('./features/admin/custom-pricing/custom-pricing.component').then(m => m.CustomPricingComponent), canActivate: [permissionGuard], data: { requiredPermission: 'ManageServices' } },
      { path: 'packages',      loadComponent: () => import('./features/admin/packages/packages.component').then(m => m.PackagesComponent), canActivate: [permissionGuard], data: { requiredPermission: 'ManageDepositPackages' } },
      { path: 'meetings',      loadComponent: () => import('./features/admin/meetings/meetings.component').then(m => m.MeetingsComponent), canActivate: [permissionGuard], data: { requiredPermission: 'ScheduleMeetings' } },
      { path: 'wallet',        loadComponent: () => import('./features/admin/wallet/admin-wallet.component').then(m => m.AdminWalletComponent), canActivate: [permissionGuard], data: { requiredPermission: 'FinancialAdjustments' } },
      { path: 'transactions',  loadComponent: () => import('./features/admin/transactions/transactions.component').then(m => m.TransactionsComponent), canActivate: [permissionGuard], data: { requiredPermission: 'FinancialAdjustments' } },
      { path: 'financials',    loadComponent: () => import('./features/admin/financials/admin-financials.component').then(m => m.AdminFinancialsComponent), canActivate: [permissionGuard], data: { requiredPermission: 'FinancialAdjustments' } },
      { path: 'audit-logs',    loadComponent: () => import('./features/admin/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent), canActivate: [permissionGuard], data: { expectedRoles: ['SuperAdmin'] } },
      { path: 'settings',      loadComponent: () => import('./features/admin/settings/settings.component').then(m => m.SettingsComponent), canActivate: [permissionGuard], data: { expectedRoles: ['SuperAdmin'] } },
      { path: 'profile',       loadComponent: () => import('./features/client/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'support',       loadComponent: () => import('./features/support/support.component').then(m => m.SupportComponent) },
    ]
  },

  // ─── Public: Home Page ─────────────────────────────────────────────────────
  { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },

  // ─── Fallback ─────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' }
];
