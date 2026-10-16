import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth.guard';

// Every feature area is lazy loaded.
export const routes: Routes = [
  {path:'auth',loadComponent:()=>import('./features/auth/auth.component').then(m=>m.AuthComponent),title:'Sign in · InterviewForge'},
  {path:'',canActivateChild:[authGuard],children:[
  {path:'admin',canActivate:[adminGuard],loadComponent:()=>import('./features/admin/admin.component').then(m=>m.AdminComponent),title:'Administration · InterviewForge'},
  {path:'feedback',loadComponent:()=>import('./features/feedback/feedback.component').then(m=>m.FeedbackComponent),title:'My feedback · InterviewForge'},
  {path:'algorithms/new',loadComponent:()=>import('./features/algorithms/algorithm-form.component').then(m=>m.AlgorithmFormComponent),title:'New algorithm · InterviewForge'},
  {path:'algorithms/:slug/edit',loadComponent:()=>import('./features/algorithms/algorithm-form.component').then(m=>m.AlgorithmFormComponent),title:'Edit algorithm · InterviewForge'},
  { path: '', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent), title: 'Dashboard · InterviewForge' },
  { path: 'plan', loadComponent: () => import('./features/plan/plan-overview.component').then(m => m.PlanOverviewComponent), title: 'Preparation plan · InterviewForge' },
  { path: 'plan/new', loadComponent: () => import('./features/plan/plan-form.component').then(m => m.PlanFormComponent), title: 'New plan · InterviewForge' },
  { path: 'plan/:planId/edit', loadComponent: () => import('./features/plan/plan-form.component').then(m => m.PlanFormComponent), title: 'Edit plan · InterviewForge' },
  { path: 'plan/:planId/day/:day', loadComponent: () => import('./features/plan/plan-day.component').then(m => m.PlanDayComponent), title: 'Plan day · InterviewForge' },
  { path: 'progress', loadComponent: () => import('./features/plan/progress.component').then(m => m.ProgressComponent), title: 'Progress · InterviewForge' },
  { path: 'sections', loadComponent: () => import('./features/sections/sections.component').then(m => m.SectionsComponent), title: 'Sections · InterviewForge' },
  { path: 'sections/:id', loadComponent: () => import('./features/sections/section-detail.component').then(m => m.SectionDetailComponent), title: 'Section · InterviewForge' },
  { path: 'topics', loadComponent: () => import('./features/topics/topics.component').then(m => m.TopicsComponent), title: 'Topics · InterviewForge' },
  { path: 'topics/:id', loadComponent: () => import('./features/topics/topic-detail.component').then(m => m.TopicDetailComponent), title: 'Topic · InterviewForge' },
  { path: 'questions/new', loadComponent: () => import('./features/questions/question-form.component').then(m => m.QuestionFormComponent), title: 'New question · InterviewForge' },
  { path: 'questions/:id/edit', loadComponent: () => import('./features/questions/question-form.component').then(m => m.QuestionFormComponent), title: 'Edit question · InterviewForge' },
  { path: 'questions/:id', loadComponent: () => import('./features/questions/question-detail.component').then(m => m.QuestionDetailComponent), title: 'Question · InterviewForge' },
  { path: 'search', loadComponent: () => import('./features/search/search.component').then(m => m.SearchComponent), title: 'Search · InterviewForge' },
  { path: 'algorithms', loadComponent: () => import('./features/algorithms/algorithms.component').then(m => m.AlgorithmsComponent), title: 'Algorithms · InterviewForge' },
  { path: 'algorithms/:slug', loadComponent: () => import('./features/algorithms/algorithm-detail.component').then(m => m.AlgorithmDetailComponent), title: 'Algorithm · InterviewForge' },
  { path: 'review', loadComponent: () => import('./features/review/review.component').then(m => m.ReviewComponent), title: 'Review · InterviewForge' },
  { path: 'interview', loadComponent: () => import('./features/interview/interview.component').then(m => m.InterviewComponent), title: 'Interview mode · InterviewForge' },
  { path: 'notes', loadComponent: () => import('./features/notes/notes.component').then(m => m.NotesComponent), title: 'My notes · InterviewForge' },
  { path: 'mine', loadComponent: () => import('./features/my-content/my-content.component').then(m => m.MyContentComponent), title: 'My content · InterviewForge' },
  { path: 'settings', canActivate:[adminGuard], loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent), title: 'Settings · InterviewForge' },
  { path: '**', redirectTo: '' }
  ]}
];
