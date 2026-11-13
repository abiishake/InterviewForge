import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AlgorithmSummary, Section, Topic } from '../models';
import { ApiService } from './api.service';

/**
 * Stale-while-revalidate cache for list data that every page re-reads (sections, topics, algorithms).
 * Pages show the cached value instantly and always revalidate in the background, because the values carry
 * per-user progress counts. The cache is per account: it is cleared on sign-in/out, and whenever shared
 * content is created, edited or deleted.
 */
@Injectable({ providedIn: 'root' })
export class ReferenceDataService {
  private api = inject(ApiService);
  readonly sections = signal<Section[] | null>(null);
  readonly topics = signal<Topic[] | null>(null);
  readonly algorithms = signal<AlgorithmSummary[] | null>(null);
  /** Bumped by clear() so a response that was in flight during sign-out cannot repopulate the cache. */
  private generation = 0;

  refreshSections(): Observable<Section[]> { return this.guard(this.api.sections(), this.sections); }
  refreshTopics(): Observable<Topic[]> { return this.guard(this.api.topics(), this.topics); }
  refreshAlgorithms(): Observable<AlgorithmSummary[]> { return this.guard(this.api.algorithms(), this.algorithms); }

  clear(): void {
    this.generation++;
    this.sections.set(null); this.topics.set(null); this.algorithms.set(null);
  }

  private guard<T>(source: Observable<T>, target: { set(v: T | null): void }): Observable<T> {
    const gen = this.generation;
    return source.pipe(tap(v => { if (gen === this.generation) target.set(v); }));
  }
}
