import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AlgorithmDetail, AlgorithmSummary, CreatePlan, Dashboard, Note, OverallProgress, Paged, Plan, PlanDayDetail, PlanDaySummary,
  QuestionDetail, QuestionFilter, QuestionSummary, ReviewBucket, ReviewOverview, SaveQuestion, SearchResult, Section, SectionDetail,
  Topic, UpdateProgress, UserState
} from '../models';

/** Thin typed wrapper over the REST API. All calls are relative so the SPA works behind any host/port. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  createAlgorithm(body: import('../models').SaveAlgorithm) { return this.http.post<AlgorithmDetail>('/api/algorithms',body); }
  updateAlgorithm(slug:string,body:import('../models').SaveAlgorithm) { return this.http.put<AlgorithmDetail>('/api/algorithms/'+encodeURIComponent(slug),body); }
  deleteAlgorithm(slug:string) { return this.http.delete<void>('/api/algorithms/'+encodeURIComponent(slug)); }
  sendFeedback(kind:string,contentId:number,message:string) {return this.http.post<import('../models').Feedback>('/api/feedback',{kind,contentId,message});}
  feedback() {return this.http.get<import('../models').Feedback[]>('/api/feedback');}
  feedbackAll(status = '', page = 1, pageSize = 25) {return this.http.get<Paged<import('../models').Feedback>>('/api/feedback/all', { params: this.params({ status, page, pageSize }) });}
  reviewFeedback(id:number,status:string,adminResponse:string) {return this.http.put<import('../models').Feedback>(`/api/feedback/${id}/review`,{status,adminResponse});}
  adminUsers(q: import('../models').UserListQuery = {}) { return this.http.get<Paged<import('../models').AdminUserListItem>>('/api/admin/users', { params: this.params({ ...q }) }); }
  adminUser(id: string) { return this.http.get<import('../models').AdminUserDetail>(`/api/admin/users/${id}`); }
  createUser(body: { username: string; displayName: string; email: string; role: string; password?: string; generatePassword: boolean }) { return this.http.post<{ user: import('../models').AdminUserDetail; temporaryPassword?: string }>('/api/admin/users', body); }
  updateUser(id: string, body: { username: string; displayName: string; email: string }) { return this.http.put<import('../models').AdminUserDetail>(`/api/admin/users/${id}`, body); }
  setUserRole(id: string, role: string) { return this.http.post<import('../models').AdminUserDetail>(`/api/admin/users/${id}/role`, { role }); }
  setUserDisabled(id: string, disabled: boolean) { return this.http.post<import('../models').AdminUserDetail>(`/api/admin/users/${id}/${disabled ? 'disable' : 'enable'}`, {}); }
  resetUserPassword(id: string, password?: string) { return this.http.post<{ temporaryPassword: string }>(`/api/admin/users/${id}/reset-password`, { password }); }
  revokeUserSessions(id: string) { return this.http.post<void>(`/api/admin/users/${id}/revoke-sessions`, {}); }
  deleteUser(id: string, confirmUsername: string) { return this.http.request<void>('DELETE', `/api/admin/users/${id}`, { body: { confirmUsername } }); }
  registrationSetting() { return this.http.get<{ registration: 'Open' | 'Closed' }>('/api/admin/settings'); }
  setRegistration(registration: 'Open' | 'Closed') { return this.http.put<{ registration: 'Open' | 'Closed' }>('/api/admin/settings', { registration }); }
  audit(q: { target?: string; action?: string; page?: number; pageSize?: number } = {}) { return this.http.get<Paged<import('../models').AuditEntry>>('/api/admin/audit', { params: this.params({ ...q }) }); }
  adminProgress(id:string){return this.http.get<import('../models').AdminProgress>(`/api/admin/users/${id}/progress`);}
  private base = '/api';

  private params(obj: Record<string, string | number | boolean | null | undefined>): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(obj)) if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    return p;
  }

  dashboard(): Observable<Dashboard> { return this.http.get<Dashboard>(`${this.base}/dashboard`); }

  sections(): Observable<Section[]> { return this.http.get<Section[]>(`${this.base}/sections`); }
  section(id: number): Observable<SectionDetail> { return this.http.get<SectionDetail>(`${this.base}/sections/${id}`); }
  createSection(name: string, description?: string): Observable<Section> { return this.http.post<Section>(`${this.base}/sections`, { name, description }); }
  updateSection(id: number, name: string, description?: string) { return this.http.put<void>(`${this.base}/sections/${id}`, { name, description }); }
  deleteSection(id: number) { return this.http.delete<void>(`${this.base}/sections/${id}`); }

  topics(sectionId?: number): Observable<Topic[]> { return this.http.get<Topic[]>(`${this.base}/topics`, { params: this.params({ sectionId }) }); }
  topic(id: number): Observable<Topic> { return this.http.get<Topic>(`${this.base}/topics/${id}`); }
  createTopic(sectionId: number, name: string, description?: string): Observable<Topic> { return this.http.post<Topic>(`${this.base}/topics`, { sectionId, name, description }); }
  updateTopic(id: number, sectionId: number, name: string, description?: string) { return this.http.put<void>(`${this.base}/topics/${id}`, { sectionId, name, description }); }
  deleteTopic(id: number) { return this.http.delete<void>(`${this.base}/topics/${id}`); }
  topicQuestions(id: number, filter: QuestionFilter, page = 1, pageSize = 100): Observable<Paged<QuestionSummary>> {
    return this.http.get<Paged<QuestionSummary>>(`${this.base}/topics/${id}/questions`, { params: this.params({ filter, page, pageSize }) });
  }

  questions(opts: { topicId?: number; sectionId?: number; filter?: QuestionFilter; tag?: string; page?: number; pageSize?: number; random?: boolean; limit?: number }): Observable<Paged<QuestionSummary>> {
    return this.http.get<Paged<QuestionSummary>>(`${this.base}/questions`, { params: this.params(opts) });
  }
  question(id: number, topicId?: number): Observable<QuestionDetail> { return this.http.get<QuestionDetail>(`${this.base}/questions/${id}`, { params: this.params({ topicId }) }); }
  createQuestion(q: SaveQuestion): Observable<QuestionDetail> { return this.http.post<QuestionDetail>(`${this.base}/questions`, q); }
  updateQuestion(id: number, q: SaveQuestion): Observable<QuestionDetail> { return this.http.put<QuestionDetail>(`${this.base}/questions/${id}`, q); }
  impact(kind: 'questions' | 'topics' | 'sections', id: number) { return this.http.get<import('../models').ContentImpact>(`${this.base}/${kind}/${id}/impact`); }
  deletedSeeds() { return this.http.get<{ kind: string; key: string }[]>('/api/admin/deleted-seeds'); }
  restoreSeed(kind: string, key: string) { return this.http.post<Record<string, unknown>>('/api/admin/deleted-seeds/restore', { kind, key }); }
  deleteQuestion(id: number) { return this.http.delete<void>(`${this.base}/questions/${id}`); }
  progress(id: number, body: UpdateProgress): Observable<UserState> { return this.http.post<UserState>(`${this.base}/questions/${id}/progress`, body); }
  saveNote(id: number, body: string) { return this.http.put<Note | null>(`${this.base}/questions/${id}/note`, { body }); }
  notes(page = 1, pageSize = 25): Observable<Paged<Note>> { return this.http.get<Paged<Note>>(`${this.base}/notes`, { params: this.params({ page, pageSize }) }); }
  tags(): Observable<string[]> { return this.http.get<string[]>(`${this.base}/tags`); }

  search(q: string, filter: QuestionFilter = 'All', page = 1): Observable<SearchResult> {
    return this.http.get<SearchResult>(`${this.base}/search`, { params: this.params({ q, filter, page }) });
  }

  algorithms(): Observable<AlgorithmSummary[]> { return this.http.get<AlgorithmSummary[]>(`${this.base}/algorithms`); }
  algorithm(slug: string): Observable<AlgorithmDetail> { return this.http.get<AlgorithmDetail>(`${this.base}/algorithms/${encodeURIComponent(slug)}`); }

  reviewOverview(): Observable<ReviewOverview> { return this.http.get<ReviewOverview>(`${this.base}/review`); }
  reviewQueue(bucket: ReviewBucket, page = 1, pageSize = 50): Observable<Paged<QuestionSummary>> {
    return this.http.get<Paged<QuestionSummary>>(`${this.base}/review/queue`, { params: this.params({ bucket, page, pageSize }) });
  }
  overallProgress(): Observable<OverallProgress> { return this.http.get<OverallProgress>(`${this.base}/progress`); }

  plans(): Observable<Plan[]> { return this.http.get<Plan[]>(`${this.base}/plans`); }
  plan(id: number): Observable<Plan> { return this.http.get<Plan>(`${this.base}/plans/${id}`); }
  createPlan(p: CreatePlan): Observable<Plan> { return this.http.post<Plan>(`${this.base}/plans`, p); }
  updatePlan(id: number, p: Partial<CreatePlan> & { regenerate?: boolean }): Observable<Plan> { return this.http.put<Plan>(`${this.base}/plans/${id}`, p); }
  deletePlan(id: number) { return this.http.delete<void>(`${this.base}/plans/${id}`); }
  planDays(id: number): Observable<PlanDaySummary[]> { return this.http.get<PlanDaySummary[]>(`${this.base}/plans/${id}/days`); }
  planDay(id: number, day: number): Observable<PlanDayDetail> { return this.http.get<PlanDayDetail>(`${this.base}/plans/${id}/days/${day}`); }
  planAction(id: number, action: 'pause' | 'resume' | 'restart' | 'current'): Observable<Plan> { return this.http.post<Plan>(`${this.base}/plans/${id}/${action}`, {}); }
  regenerate(id: number, fromDay?: number) { return this.http.post(`${this.base}/plans/${id}/generate`, {}, { params: this.params({ fromDay }) }); }
  skipDay(id: number, day: number) { return this.http.post<void>(`${this.base}/plans/${id}/days/${day}/skip`, {}); }
  moveItem(id: number, itemId: number, targetDayNumber: number) { return this.http.post<void>(`${this.base}/plans/${id}/items/${itemId}/move`, { targetDayNumber }); }
  reschedule(id: number) { return this.http.post<{ moved: number }>(`${this.base}/plans/${id}/reschedule`, {}); }

  runImport() { return this.http.post<Record<string, unknown>>(`${this.base}/admin/import`, {}); }
}
