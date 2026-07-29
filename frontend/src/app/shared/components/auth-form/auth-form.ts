import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, LogIn, TriangleAlert, UserPlus } from 'lucide-angular';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';

interface GoogleCredentialResponse {
  credential: string;
}

declare const google: {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }): void;
      renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
    };
  };
};

/**
 * Reusable email/password + Google login & registration form, shared by the
 * admin and customer login pages (they hit the same backend endpoints — only
 * the storage key/session and the post-login redirect differ, both handled
 * here via `mode`). Page chrome (dark admin vs light customer) lives in the
 * two wrapping pages.
 */
@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './auth-form.html',
})
export class AuthForm implements AfterViewInit {
  readonly mode = input<'admin' | 'customer'>('customer');
  readonly dark = input(false);

  private readonly authService = inject(AuthService);
  private readonly customerAuthService = inject(CustomerAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);

  private readonly googleButton = viewChild<ElementRef<HTMLDivElement>>('googleButton');

  readonly LogInIcon = LogIn;
  readonly UserPlusIcon = UserPlus;
  readonly TriangleAlertIcon = TriangleAlert;

  /** Two-way bound so a host page can keep its own heading in sync with the mode. */
  readonly isRegistering = model(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly googleEnabled = signal(Boolean(environment.googleClientId));

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly registerForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.pattern(/^[0-9]{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngAfterViewInit(): void {
    this.renderGoogleButton();
  }

  private get activeService() {
    return this.mode() === 'admin' ? this.authService : this.customerAuthService;
  }

  toggleMode(): void {
    this.isRegistering.update((v) => !v);
    this.errorMessage.set(null);
  }

  login(): void {
    if (this.loginForm.invalid || this.submitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }
    const { email, password } = this.loginForm.getRawValue();
    this.runAuth(this.activeService.login(email, password), 'Incorrect email or password.');
  }

  register(): void {
    if (this.registerForm.invalid || this.submitting()) {
      this.registerForm.markAllAsTouched();
      return;
    }
    const { name, email, mobile, password } = this.registerForm.getRawValue();
    this.runAuth(
      this.activeService.register({ name, email, password, mobile: mobile || undefined }),
      'Could not create your account. That email may already be registered.',
    );
  }

  private runAuth(request: ReturnType<typeof this.activeService.login>, fallbackError: string): void {
    this.submitting.set(true);
    this.errorMessage.set(null);

    request.subscribe({
      next: () => {
        this.submitting.set(false);
        const fallback = this.mode() === 'admin' ? '/admin' : '/account';
        this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('redirectTo') ?? fallback);
      },
      error: (err: { error?: { message?: string } }) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? fallbackError);
      },
    });
  }

  private renderGoogleButton(): void {
    const container = this.googleButton()?.nativeElement;
    if (!container || !environment.googleClientId || typeof google === 'undefined') {
      this.googleEnabled.set(false);
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response) =>
        this.runAuth(
          this.activeService.loginWithGoogle(response.credential),
          'Could not sign you in with Google.',
        ),
    });

    google.accounts.id.renderButton(container, {
      theme: this.dark() ? 'filled_black' : 'outline',
      size: 'large',
      width: 320,
      text: 'continue_with',
      shape: 'pill',
    });
  }
}
