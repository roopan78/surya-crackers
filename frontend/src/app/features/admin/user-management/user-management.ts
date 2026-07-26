import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, Search, ShieldCheck } from 'lucide-angular';
import { AdminUserService } from '../../../core/services/admin-user.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthUser, Role } from '../../../core/models';
import { ToastService } from '../../../shared/services/toast.service';

const ROLE_OPTIONS: Role[] = ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'];

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, DatePipe],
  templateUrl: './user-management.html',
})
export class UserManagement implements OnInit {
  readonly userService = inject(AdminUserService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly SearchIcon = Search;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly roleOptions = ROLE_OPTIONS;
  readonly searchTerm = signal('');

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
        this.userService.loadUsers({ search: this.searchTerm() });
      },
      error: () => this.toastService.error('Could not update this user’s role — please try again.'),
    });
  }
}
