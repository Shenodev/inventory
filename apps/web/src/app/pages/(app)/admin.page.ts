import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouteMeta } from '@analogjs/router';

import { formatDate } from '../../core/format';
import { AdminUsersService, AdminUser } from '../../core/admin/users.service';
import { ALL_ROLES } from '../../core/auth/roles';
import { AuthSessionStore } from '../../core/auth/auth-session.store';
import { roleGuard } from '../../core/auth/role.guard';
import { ToastService } from '../../core/ui/toast.service';
import { apiErrorMessage } from '../../core/api-error';

export const routeMeta: RouteMeta = {
  title: 'Users & Roles · ShenoInventory',
  meta: [
    {
      name: 'description',
      content: 'User management — admin, manager, operator and viewer roles for the workspace.',
    },
  ],
  canActivate: [roleGuard],
  data: { roles: ['admin'] },
};

interface EditorState {
  user: AdminUser | null;
}

@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-white">Users & Roles</h1>
        <p class="mt-1 text-sm text-slate-400">
          {{ users().length }} account{{ users().length === 1 ? '' : 's' }} across the workspace.
        </p>
      </div>
      <div class="flex gap-3">
        <button
          type="button"
          (click)="load(true)"
          [disabled]="loading()"
          class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading() ? 'Refreshing…' : 'Refresh' }}
        </button>
        <button
          type="button"
          (click)="openCreate()"
          class="rounded-xl bg-electric-cyan px-4 py-2 text-sm font-medium text-deep-slate transition-colors hover:bg-cyan-400"
        >
          New user
        </button>
      </div>
    </header>

    @if (notice(); as message) {
      <div
        class="mt-6 flex items-center justify-between gap-4 rounded-xl border border-electric-cyan/30 bg-electric-cyan/10 px-5 py-4"
        role="status"
      >
        <p class="text-sm text-slate-200">{{ message }}</p>
        <button
          type="button"
          (click)="notice.set(null)"
          class="shrink-0 text-sm font-medium text-electric-cyan transition-colors hover:text-cyan-200"
        >
          Dismiss
        </button>
      </div>
    }

    @if (error(); as message) {
      <div
        class="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4"
      >
        <p class="text-sm text-red-200">{{ message }}</p>
        <button
          type="button"
          (click)="load(true)"
          class="shrink-0 rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    }

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <label class="relative flex min-w-0 flex-1 items-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          class="pointer-events-none absolute left-3 h-4 w-4 text-slate-500"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.4-3.4" />
        </svg>
        <input
          type="search"
          placeholder="Search by name, email or role…"
          [value]="query()"
          (input)="onQuery($event)"
          class="w-full rounded-xl border border-white/10 bg-surface py-2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
        />
        @if (query() !== '') {
          <button
            type="button"
            (click)="clearQuery()"
            aria-label="Clear search"
            class="absolute right-2 rounded-lg p-1 text-slate-400 transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        }
      </label>
      <span class="text-sm text-slate-500">{{ resultLabel() }}</span>
    </div>

    <section class="mt-4 overflow-hidden rounded-xl bg-surface">
      <div class="max-h-[70vh] overflow-y-auto">
        <table class="w-full text-left text-sm">
          <thead
            class="sticky top-0 z-10 border-b border-white/5 bg-surface text-xs uppercase tracking-wide text-slate-500"
          >
            <tr>
              <th scope="col" class="px-6 py-3 font-medium">User</th>
              <th scope="col" class="px-6 py-3 font-medium">Role</th>
              <th scope="col" class="px-6 py-3 font-medium">Added</th>
              <th scope="col" class="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (user of visibleUsers(); track user.id) {
              <tr class="transition-colors hover:bg-deep-slate/60">
                <td class="px-6 py-4">
                  <p class="font-medium text-white">
                    {{ user.name }}
                    @if (user.id === currentUserId()) {
                      <span class="ml-1.5 rounded-full border border-white/10 bg-deep-slate px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">You</span>
                    }
                  </p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ user.email }}</p>
                </td>
                <td class="px-6 py-4">
                  <select
                    [disabled]="user.id === currentUserId() || roleSaving() !== null"
                    (change)="onRoleChange($event, user)"
                    aria-label="Change role for {{ user.name }}"
                    class="rounded-xl border border-white/10 bg-deep-slate px-3 py-1.5 text-sm font-medium text-slate-200 outline-none focus:border-electric-cyan disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    @for (role of allRoles; track role) {
                      <option [value]="role" [selected]="user.role === role">{{ roleLabel(role) }}</option>
                    }
                  </select>
                </td>
                <td class="px-6 py-4 text-sm text-slate-400">
                  {{ formatDate(user.created_at) }}
                </td>
                <td class="px-6 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      (click)="openEdit(user)"
                      class="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-electric-cyan/40 hover:text-electric-cyan"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      (click)="requestDelete(user)"
                      [disabled]="user.id === currentUserId()"
                      class="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-6 py-10 text-center text-slate-500">
                  {{ emptyLabel() }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (filteredUsers().length > visibleUsers().length) {
      <div class="mt-4 flex justify-center">
        <button
          type="button"
          (click)="showMore()"
          class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface hover:text-white"
        >
          Show more ({{ filteredUsers().length - visibleUsers().length }} remaining)
        </button>
      </div>
    }

    @if (editor(); as state) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="closeEditor()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-editor-title"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="user-editor-title" class="font-heading text-lg font-semibold text-white">
                {{ state.user === null ? 'New user' : 'Edit user' }}
              </h2>
              <p class="mt-1 text-sm text-slate-400">
                {{
                  state.user === null
                    ? 'Create an account and choose its role.'
                    : state.user.email
                }}
              </p>
            </div>
            <button
              type="button"
              (click)="closeEditor()"
              aria-label="Close dialog"
              class="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-deep-slate hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <form class="mt-5" [formGroup]="form" (ngSubmit)="submitEditor()">
            <label class="block text-sm font-medium text-slate-300" for="user-name">
              Full name
            </label>
            <input
              id="user-name"
              type="text"
              formControlName="name"
              placeholder="e.g. Priit Kaasik"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />

            <label class="mt-4 block text-sm font-medium text-slate-300" for="user-email">
              Email
            </label>
            <input
              id="user-email"
              type="email"
              formControlName="email"
              placeholder="name@shenodev.tech"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />

            <label class="mt-4 block text-sm font-medium text-slate-300" for="user-role">
              Role
            </label>
            <select
              id="user-role"
              formControlName="role"
              [disabled]="state.user !== null && state.user.id === currentUserId()"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none focus:border-electric-cyan disabled:cursor-not-allowed disabled:opacity-60"
            >
              @for (role of allRoles; track role) {
                <option [value]="role">{{ roleLabel(role) }} — {{ roleHint(role) }}</option>
              }
            </select>
            @if (state.user !== null && state.user.id === currentUserId()) {
              <p class="mt-1 text-xs text-slate-500">You cannot change your own role away from admin.</p>
            }

            <label class="mt-4 block text-sm font-medium text-slate-300" for="user-password">
              Password
              @if (state.user !== null) {
                <span class="text-slate-500">(leave blank to keep current)</span>
              }
            </label>
            <input
              id="user-password"
              type="password"
              formControlName="password"
              autocomplete="new-password"
              placeholder="At least 8 characters"
              class="mt-1 w-full rounded-xl border border-white/10 bg-deep-slate px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-electric-cyan"
            />
            @if (state.user !== null) {
              <p class="mt-1 text-xs text-slate-500">
                Leave blank to keep the existing password.
              </p>
            }

            @if (formError(); as message) {
              <p
                class="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {{ message }}
              </p>
            }

            <div class="mt-6 flex gap-3">
              <button
                type="button"
                (click)="closeEditor()"
                [disabled]="saving()"
                class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="saving()"
                class="flex-1 rounded-xl bg-electric-cyan px-4 py-3 font-medium text-deep-slate transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ saving() ? 'Saving…' : state.user === null ? 'Create user' : 'Save changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (deleteTarget(); as user) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/80 px-4 py-8 backdrop-blur-sm"
        (click)="cancelDelete()"
      >
        <div
          class="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-left"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
          (click)="$event.stopPropagation()"
        >
          <h2 id="delete-user-title" class="font-heading text-lg font-semibold text-white">
            Delete {{ user.name }}?
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            This permanently removes the account ({{ user.email }}). The user can no longer sign in, and their access tokens are revoked.
          </p>
          @if (formError(); as message) {
            <p
              class="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              {{ message }}
            </p>
          }
          <div class="mt-6 flex gap-3">
            <button
              type="button"
              (click)="cancelDelete()"
              [disabled]="saving()"
              class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-deep-slate hover:text-white disabled:opacity-60"
            >
              Keep user
            </button>
            <button
              type="button"
              (click)="confirmDelete()"
              [disabled]="saving() || user.id === currentUserId()"
              class="flex-1 rounded-xl bg-red-500/90 px-4 py-3 font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ saving() ? 'Deleting…' : 'Delete user' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export default class AdminPage {
  protected readonly allRoles = ALL_ROLES;

  private readonly usersService = inject(AdminUsersService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly session = inject(AuthSessionStore);
  private readonly toaster = inject(ToastService);

  protected readonly users = signal<AdminUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly query = signal('');
  protected readonly limit = signal(50);

  protected readonly editor = signal<EditorState | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly roleSaving = signal<number | null>(null);
  protected readonly deleteTarget = signal<AdminUser | null>(null);

  protected readonly form = this.formBuilder.group({
    name: this.formBuilder.control('', [Validators.required, Validators.maxLength(120)]),
    email: this.formBuilder.control('', [Validators.required, Validators.email, Validators.maxLength(120)]),
    role: this.formBuilder.control('operator', [Validators.required]),
    password: this.formBuilder.control('', [Validators.minLength(8)]),
  });

  protected readonly filteredUsers = computed(() => {
    const needle = this.query().trim().toLowerCase();

    if (needle === '') {
      return this.users();
    }

    return this.users().filter((user) => {
      const searchable = `${user.name} ${user.email} ${user.role}`.toLowerCase();
      return searchable.includes(needle);
    });
  });

  protected readonly visibleUsers = computed(() => this.filteredUsers().slice(0, this.limit()));

  protected readonly currentUserId = computed(() => this.session.user()?.id ?? -1);

  constructor() {
    afterNextRender(() => this.load());
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeEditor();
    this.cancelDelete();
  }

  protected load(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersService.list(force).subscribe({
      next: ({ users }) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error, 'Unable to load users right now.'));
      },
    });
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.limit.set(50);
  }

  protected clearQuery(): void {
    this.query.set('');
    this.limit.set(50);
  }

  protected showMore(): void {
    this.limit.update((current) => current + 50);
  }

  protected resultLabel(): string {
    const needle = this.query().trim();

    if (needle === '') {
      return `${this.users().length} account${this.users().length === 1 ? '' : 's'}`;
    }

    const count = this.filteredUsers().length;

    return `${count} match${count === 1 ? '' : 'es'} for "${needle}"`;
  }

  protected emptyLabel(): string {
    if (this.loading()) {
      return 'Loading users…';
    }

    if (this.query().trim() !== '') {
      return 'No users match your search.';
    }

    return 'No users found yet.';
  }

  protected roleLabel(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  protected roleHint(role: string): string {
    switch (role) {
      case 'admin':
        return 'Full access, incl. users & financials';
      case 'manager':
        return 'All operations & financials, no user management';
      case 'operator':
        return 'Day-to-day stock & order entry';
      default:
        return 'Read-only access';
    }
  }

  protected openCreate(): void {
    this.form.reset({ name: '', email: '', role: 'operator', password: '' });
    this.formError.set(null);
    this.editor.set({ user: null });
  }

  protected openEdit(user: AdminUser): void {
    this.form.reset({ name: user.name, email: user.email, role: user.role, password: '' });
    this.formError.set(null);
    this.editor.set({ user });
  }

  protected closeEditor(): void {
    if (this.saving()) {
      return;
    }

    this.editor.set(null);
  }

  protected submitEditor(): void {
    const state = this.editor();

    if (state === null || this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Please fix the highlighted fields.');
      return;
    }

    const { name, email, role, password } = this.form.getRawValue();

    if (state.user === null && password.trim() === '') {
      this.formError.set('A password of at least 8 characters is required for a new user.');
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    const request =
      state.user === null
        ? this.usersService.create({
            name: name.trim(),
            email: email.trim(),
            password,
            role,
          })
        : this.usersService.update(state.user.id, {
            name: name.trim(),
            email: email.trim(),
            role,
            password: password.trim() === '' ? null : password,
          });

    request.subscribe({
      next: ({ message, user }) => {
        this.saving.set(false);
        this.editor.set(null);
        this.upsert(user);
        this.notice.set(message);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(this.messageFor(error, 'Unable to save the user right now.'));
      },
    });
  }

  protected requestDelete(user: AdminUser): void {
    if (user.id === this.currentUserId()) {
      return;
    }

    this.formError.set(null);
    this.deleteTarget.set(user);
  }

  protected cancelDelete(): void {
    if (this.saving()) {
      return;
    }

    this.deleteTarget.set(null);
  }

  protected confirmDelete(): void {
    const user = this.deleteTarget();

    if (user === null || this.saving() || user.id === this.currentUserId()) {
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    this.usersService.destroy(user.id).subscribe({
      next: ({ message }) => {
        this.saving.set(false);
        this.deleteTarget.set(null);
        this.users.update((list) => list.filter((item) => item.id !== user.id));
        this.notice.set(message);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(this.messageFor(error, 'Unable to delete the user right now.'));
      },
    });
  }

  protected onRoleChange(event: Event, user: AdminUser): void {
    const target = event.target as HTMLSelectElement;
    const role = target.value;

    if (role === user.role || this.roleSaving() !== null) {
      return;
    }

    this.roleSaving.set(user.id);

    this.usersService.updateRole(user.id, role).subscribe({
      next: ({ message, user: updated }) => {
        this.roleSaving.set(null);
        this.replaceUser({ ...user, role: updated.role });
        this.toaster.show(message);
      },
      error: (error: unknown) => {
        this.roleSaving.set(null);
        // Revert the <select> to the user's actual role on the server.
        this.replaceUser({ ...user });
        this.toaster.show(this.messageFor(error, 'Unable to change the role right now.'), 'error');
      },
    });
  }

  protected formatDate(value: string | null): string {
    return formatDate(value);
  }

  private upsert(user: AdminUser): void {
    this.users.update((list) => {
      const index = list.findIndex((item) => item.id === user.id);

      if (index === -1) {
        return [...list, user].sort((a, b) => a.name.localeCompare(b.name));
      }

      const copy = [...list];
      copy[index] = user;
      return copy;
    });
  }

  private replaceUser(user: AdminUser): void {
    this.users.update((list) => list.map((item) => (item.id === user.id ? user : item)));
  }

  private messageFor(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 422)) {
      const body = error.error as { message?: string; errors?: Record<string, string[]> } | null;
      const first = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
      return first ?? body?.message ?? fallback;
    }

    return apiErrorMessage(error, fallback);
  }
}