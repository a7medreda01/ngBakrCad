import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { EmployeeDto, UserRole, AddEmployeeRequest, RolePermissionsSummaryDto } from '../../../core/models';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss'
})
export class EmployeesComponent implements OnInit {
  readonly adminService = inject(AdminService);
  readonly authService = inject(AuthService);
  readonly toast = inject(ToastService);
  readonly translationService = inject(TranslationService);

  readonly employees = signal<EmployeeDto[]>([]);
  readonly totalCount = signal(0);
  readonly isLoading = signal(false);

  // Filters
  readonly searchTerm = signal('');
  readonly roleFilter = signal<string>('');
  readonly pageNumber = signal(1);
  readonly pageSize = 15;

  // Stats
  readonly totalEmployees = signal(0);
  readonly superAdminCount = signal(0);
  readonly financialAdminCount = signal(0);
  readonly operationsAdminCount = signal(0);
  readonly qualityAdminCount = signal(0);

  // Modals
  readonly isAddModalOpen = signal(false);
  readonly isEditRoleModalOpen = signal(false);

  // Form states
  addEmployeeForm: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    role: UserRole;
  } = {
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    role: UserRole.OperationsAdmin
  };

  selectedEmployee = signal<EmployeeDto | null>(null);
  selectedNewRole = signal<UserRole>(UserRole.OperationsAdmin);

  // Roles catalogue – labels resolved at render time via i18n
  get availableRoles() {
    const t = (k: string) => this.translationService.translate(k);
    return [
      { value: UserRole.SuperAdmin,      key: 'SuperAdmin',      labelAr: t('role.superAdminFull'),      badgeClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      { value: UserRole.FinancialAdmin,  key: 'FinancialAdmin',  labelAr: t('role.financialAdminFull'),  badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      { value: UserRole.OperationsAdmin, key: 'OperationsAdmin', labelAr: t('role.operationsAdminFull'), badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      { value: UserRole.QualityAdmin,    key: 'QualityAdmin',    labelAr: t('role.qualityAdminFull'),    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20' }
    ];
  }

  readonly permissionsSummary: Record<string, string[]> = {
    SuperAdmin:      ['ManageUsers', 'FinancialAdjustments', 'ManageInvoices', 'ManageDepositPackages', 'ViewWalletReports', 'AssignWork', 'ManageTickets', 'ScheduleMeetings', 'ManageServices', 'QAApproval', 'ViewOrderQualityReports'],
    FinancialAdmin:  ['FinancialAdjustments', 'ManageInvoices', 'ManageDepositPackages', 'ViewWalletReports', 'ManageUsers'],
    OperationsAdmin: ['AssignWork', 'ManageTickets', 'ScheduleMeetings', 'ManageServices', 'ManageUsers'],
    QualityAdmin:    ['QAApproval', 'ViewOrderQualityReports']
  };

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading.set(true);
    this.adminService.getEmployees(this.pageNumber(), this.pageSize, this.searchTerm(), this.roleFilter())
      .subscribe({
        next: (res) => {
          this.employees.set(res.items);
          this.totalCount.set(res.totalCount);
          this.computeStats(res.items, res.totalCount);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.toast.show(err?.error?.message || 'حدث خطأ أثناء تحميل قائمة الموظفين', 'error');
          this.isLoading.set(false);
        }
      });
  }

  computeStats(items: EmployeeDto[], total: number): void {
    this.totalEmployees.set(total);
    this.superAdminCount.set(items.filter(e => e.role === 'SuperAdmin').length);
    this.financialAdminCount.set(items.filter(e => e.role === 'FinancialAdmin').length);
    this.operationsAdminCount.set(items.filter(e => e.role === 'OperationsAdmin').length);
    this.qualityAdminCount.set(items.filter(e => e.role === 'QualityAdmin').length);
  }

  onSearchChange(): void {
    this.pageNumber.set(1);
    this.loadEmployees();
  }

  onRoleFilterChange(role: string): void {
    this.roleFilter.set(role);
    this.pageNumber.set(1);
    this.loadEmployees();
  }

  openAddModal(): void {
    this.addEmployeeForm = {
      email: '',
      password: '',
      fullName: '',
      phoneNumber: '',
      role: UserRole.OperationsAdmin
    };
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  submitAddEmployee(): void {
    if (!this.addEmployeeForm.email || !this.addEmployeeForm.password || !this.addEmployeeForm.fullName) {
      this.toast.show('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }

    this.isLoading.set(true);
    const req: AddEmployeeRequest = {
      email: this.addEmployeeForm.email.trim(),
      password: this.addEmployeeForm.password,
      fullName: this.addEmployeeForm.fullName.trim(),
      phoneNumber: this.addEmployeeForm.phoneNumber.trim(),
      role: Number(this.addEmployeeForm.role)
    };

    this.authService.addEmployee(req).subscribe({
      next: () => {
        this.toast.show('تمت إضافة الموظف الجديد بنجاح', 'success');
        this.closeAddModal();
        this.loadEmployees();
      },
      error: (err) => {
        this.toast.show(err?.error?.message || 'فشل في إضافة الموظف', 'error');
        this.isLoading.set(false);
      }
    });
  }

  selectedPermissions = signal<string[]>([]);

  get allSystemPermissions() {
    const t = (k: string) => this.translationService.translate(k);
    return [
      { key: 'ManageUsers',              label: t('perm.ManageUsers') },
      { key: 'FinancialAdjustments',     label: t('perm.FinancialAdjustments') },
      { key: 'ManageInvoices',           label: t('perm.ManageInvoices') },
      { key: 'ManageDepositPackages',    label: t('perm.ManageDepositPackages') },
      { key: 'ViewWalletReports',        label: t('perm.ViewWalletReports') },
      { key: 'AssignWork',               label: t('perm.AssignWork') },
      { key: 'ManageTickets',            label: t('perm.ManageTickets') },
      { key: 'ScheduleMeetings',         label: t('perm.ScheduleMeetings') },
      { key: 'ManageServices',           label: t('perm.ManageServices') },
      { key: 'QAApproval',               label: t('perm.QAApproval') },
      { key: 'ViewOrderQualityReports',  label: t('perm.ViewOrderQualityReports') }
    ];
  }

  openEditRoleModal(emp: EmployeeDto): void {
    this.selectedEmployee.set(emp);
    const roleEnum = this.availableRoles.find(r => r.key === emp.role)?.value ?? UserRole.OperationsAdmin;
    this.selectedNewRole.set(roleEnum);
    
    // Set permissions from employee or default role perms
    const currentPerms = (emp.permissions && emp.permissions.length > 0)
      ? [...emp.permissions]
      : (this.permissionsSummary[emp.role] || []);
    this.selectedPermissions.set(currentPerms);

    this.isEditRoleModalOpen.set(true);
  }

  closeEditRoleModal(): void {
    this.isEditRoleModalOpen.set(false);
    this.selectedEmployee.set(null);
  }

  togglePermission(permKey: string): void {
    const current = this.selectedPermissions();
    if (current.includes(permKey)) {
      this.selectedPermissions.set(current.filter(p => p !== permKey));
    } else {
      this.selectedPermissions.set([...current, permKey]);
    }
  }

  onRoleChange(newRoleValue: any): void {
    const roleNum = Number(newRoleValue);
    this.selectedNewRole.set(roleNum);
    const roleKey = this.availableRoles.find(r => r.value === roleNum)?.key;
    if (roleKey && this.permissionsSummary[roleKey]) {
      // Refresh default permissions preview for role
      this.selectedPermissions.set([...this.permissionsSummary[roleKey]]);
    }
  }

  submitUpdateRole(): void {
    const emp = this.selectedEmployee();
    if (!emp) return;

    const roleItem = this.availableRoles.find(r => r.value === Number(this.selectedNewRole()));
    const roleKey = roleItem ? roleItem.key : 'OperationsAdmin';

    this.isLoading.set(true);

    // 1. Update Role
    this.adminService.updateEmployeeRole(emp.id, roleKey).subscribe({
      next: () => {
        // 2. Update Permissions
        this.adminService.updateEmployeePermissions(emp.id, this.selectedPermissions()).subscribe({
          next: () => {
            this.toast.show('تم تحديث دور وصلاحيات الموظف بنجاح', 'success');
            this.closeEditRoleModal();
            this.loadEmployees();
          },
          error: (err) => {
            this.toast.show(err?.error?.message || 'حدث خطأ أثناء حفظ الصلاحيات', 'error');
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        this.toast.show(err?.error?.message || 'حدث خطأ أثناء تعديل دور الموظف', 'error');
        this.isLoading.set(false);
      }
    });
  }

  toggleActive(emp: EmployeeDto): void {
    const confirmKey = emp.isActive ? 'employees.freezeConfirm' : 'employees.activateConfirm';
    const actionLabel = emp.isActive
      ? this.translationService.translate('employees.freezeAccount')
      : this.translationService.translate('employees.activateAccount');

    if (!confirm(`${this.translationService.translate(confirmKey)} ${emp.fullName}؟`)) {
      return;
    }

    this.adminService.toggleActive(emp.id).subscribe({
      next: (res) => {
        this.toast.show(res.message || `${actionLabel} بنجاح`, 'success');
        this.loadEmployees();
      },
      error: (err) => {
        this.toast.show(err?.error?.message || 'فشل في تغيير حالة الحساب', 'error');
      }
    });
  }

  getRoleBadge(roleName: string): { labelAr: string; class: string } {
    const t = (k: string) => this.translationService.translate(k);
    switch (roleName) {
      case 'SuperAdmin':
        return { labelAr: t('role.superAdmin') + ' (SuperAdmin)', class: 'bg-purple-500/10 text-purple-600 border border-purple-500/20' };
      case 'FinancialAdmin':
        return { labelAr: t('role.financialAdmin') + ' (Financial)', class: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' };
      case 'OperationsAdmin':
        return { labelAr: t('role.operationsAdmin') + ' (Operations)', class: 'bg-blue-500/10 text-blue-600 border border-blue-500/20' };
      case 'QualityAdmin':
        return { labelAr: t('role.qualityAdmin') + ' (QA)', class: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' };
      default:
        return { labelAr: roleName, class: 'bg-secondary/10 text-secondary border border-secondary/20' };
    }
  }
}
