import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, Search, ShieldCheck, UserMinus, UserCheck, Trash2 } from 'lucide-angular';
import { AdminUserService } from '../../../core/services/admin-user.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthUser, Role } from '../../../core/models';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';

const ROLE_OPTIONS: Role[] = ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'];

/** Mirrors the API's retention window, only to show the countdown. */
const RETENTION_DAYS = 90;

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, DatePipe, ConfirmModal],
  templateUrl: './user-management.html',
})
export class UserManagement implements OnInit {
  readonly userService = inject(AdminUserService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly SearchIcon = Search;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly UserMinusIcon = UserMinus;
  readonly UserCheckIcon = UserCheck;
  readonly Trash2Icon = Trash2;
  readonly roleOptions = ROLE_OPTIONS;
  readonly searchTerm = signal('');

  /** The row a confirmation box is currently open for, and which action it is. */
  readonly pendingDeactivate = signal<AuthUser | null>(null);
  readonly pendingDelete = signal<AuthUser | null>(null);
  readonly busyId = signal<string | null>(null);

  readonly isSuperAdmin = computed(() => this.authService.currentUser()?.role === 'SUPER_ADMIN');

  get currentUserId(): string | undefined {
    return this.authService.currentUser()?.id;
  }

  ngOnInit(): void {
    this.userService.loadUsers();
  }

  search(): void {
    this.userService.loadUsers({ search: this.searchTerm() });
  }

  updateRole(user: AuthUser, role: Role): void {
    if (role === user.role) return;
    this.userService.updateRole(user.id, role).subscribe({
      next: () => {
        this.toastService.success(`${user.email} is now ${role}.`);
        this.reload();
      },
      error: () => this.toastService.error('Could not update this user’s role — please try again.'),
    });
  }

  /** Days left before the nightly purge deletes a deactivated account for good. */
  daysUntilPurge(user: AuthUser): number {
    if (!user.deactivatedAt) return RETENTION_DAYS;
    const elapsedDays = (Date.now() - new Date(user.deactivatedAt).getTime()) / 86_400_000;
    return Math.max(0, Math.ceil(RETENTION_DAYS - elapsedDays));
  }

  deactivateMessage(user: AuthUser): string {
    return (
      `${user.email} will no longer be able to sign in, and the account is deleted permanently ` +
      `after ${RETENTION_DAYS} days unless it is switched back on. Orders already placed are kept.`
    );
  }

  deleteMessage(user: AuthUser): string {
    return (
      `${user.email} will be erased immediately and cannot be recovered. Any order still in ` +
      `progress is cancelled; completed orders are kept under the customer's name.`
    );
  }

  confirmDeactivate(): void {
    const user = this.pendingDeactivate();
    if (!user) return;
    this.busyId.set(user.id);
    this.userService.deactivate(user.id).subscribe({
      next: () => {
        this.toastService.success(`${user.email} has been deactivated.`);
        this.finish();
      },
      // The API refuses while orders are still in progress and names them, so
      // show its message rather than a generic failure.
      error: (err: { error?: { message?: string } }) => {
        this.toastService.error(err.error?.message ?? 'Could not deactivate this account.');
        this.finish();
      },
    });
  }

  reactivate(user: AuthUser): void {
    this.busyId.set(user.id);
    this.userService.reactivate(user.id).subscribe({
      next: () => {
        this.toastService.success(`${user.email} is active again.`);
        this.finish();
      },
      error: (err: { error?: { message?: string } }) => {
        this.toastService.error(err.error?.message ?? 'Could not reactivate this account.');
        this.finish();
      },
    });
  }

  confirmDelete(): void {
    const user = this.pendingDelete();
    if (!user) return;
    this.busyId.set(user.id);
    this.userService.deleteUser(user.id).subscribe({
      next: (result) => {
        const cancelled = result.cancelledOrders
          ? ` ${result.cancelledOrders} order${result.cancelledOrders === 1 ? '' : 's'} cancelled.`
          : '';
        this.toastService.success(`${user.email} deleted.${cancelled}`);
        this.finish();
      },
      error: (err: { error?: { message?: string } }) => {
        this.toastService.error(err.error?.message ?? 'Could not delete this account.');
        this.finish();
      },
    });
  }

  private finish(): void {
    this.busyId.set(null);
    this.pendingDeactivate.set(null);
    this.pendingDelete.set(null);
    this.reload();
  }

  private reload(): void {
    this.userService.loadUsers({ search: this.searchTerm() });
  }
}
