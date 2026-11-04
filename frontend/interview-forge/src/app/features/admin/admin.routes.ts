import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      { path: 'users', loadComponent: () => import('./admin-users.component').then(m => m.AdminUsersComponent), title: 'Users · InterviewForge' },
      { path: 'users/new', loadComponent: () => import('./admin-user-create.component').then(m => m.AdminUserCreateComponent), title: 'New user · InterviewForge' },
      { path: 'users/:id', loadComponent: () => import('./admin-user-detail.component').then(m => m.AdminUserDetailComponent), title: 'User · InterviewForge' },
      { path: 'feedback', loadComponent: () => import('./admin-feedback.component').then(m => m.AdminFeedbackComponent), title: 'Feedback review · InterviewForge' },
      { path: 'import', loadComponent: () => import('../settings/settings.component').then(m => m.SettingsComponent), title: 'Import · InterviewForge' },
      { path: 'settings', loadComponent: () => import('./admin-settings.component').then(m => m.AdminSettingsComponent), title: 'Settings · InterviewForge' },
      { path: 'audit', loadComponent: () => import('./admin-audit.component').then(m => m.AdminAuditComponent), title: 'Audit log · InterviewForge' }
    ]
  }
];
