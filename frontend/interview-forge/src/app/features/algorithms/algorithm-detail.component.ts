import { FeedbackFormComponent } from '../../shared/components/feedback-form.component';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AlgorithmDetail } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { MarkdownComponent } from '../../shared/components/markdown.component';

@Component({
  selector: 'app-algorithm-detail',
  imports: [FeedbackFormComponent, RouterLink, MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      @if (a(); as a) {
        <div class="breadcrumb"><a routerLink="/algorithms">Algorithms</a> / {{ a.category }}</div>
        <h1>{{ a.name }}</h1>@if(a.addedBy){<span class="badge info">Added by {{a.addedBy}}</span>}
        @if(a.canEdit){<div class="row mt"><a class="btn" [routerLink]="['/algorithms',a.slug,'edit']">Edit</a><button class="btn danger" (click)="remove()">Delete</button></div>}
        <app-feedback-form kind="Algorithm" [contentId]="a.id" />
        <div class="row"><span class="badge accent">time {{ a.timeComplexity }}</span><span class="badge info">space {{ a.spaceComplexity }}</span></div>
        <section class="card mt"><h3>Problem statement</h3><app-markdown [source]="a.problemStatement" /></section>
        <section class="card mt"><h3>Explanation</h3><app-markdown [source]="a.explanation" />
          <h3 class="mt">Approach</h3><app-markdown [source]="a.approach" /></section>
        <section class="card mt">
          <div class="row"><h3>C# implementation</h3><span class="spacer"></span>
            <button class="btn sm" (click)="showCode.set(!showCode())">{{ showCode() ? 'Hide code' : 'Show code' }}</button>
            <button class="btn sm ghost" (click)="copy()">{{ copied() ? 'Copied' : 'Copy' }}</button></div>
          @if (showCode()) { <app-markdown [source]="a.implementation" /> } @else { <p class="muted">Try writing it yourself first.</p> }
        </section>
        <section class="card mt"><h3>Example</h3><app-markdown [source]="a.example" /></section>
        <div class="grid grid-2 mt">
          <section class="card"><h3>Common interview questions</h3><app-markdown [source]="a.interviewQuestions" /></section>
          <section class="card"><h3>Common mistakes</h3><app-markdown [source]="a.commonMistakes" /></section>
        </div>
        <div class="row mt">
          @if (a.previousSlug) { <a class="btn" [routerLink]="['/algorithms', a.previousSlug]">← Previous</a> }
          <span class="spacer"></span>
          @if (a.nextSlug) { <a class="btn primary" [routerLink]="['/algorithms', a.nextSlug]">Next →</a> }
        </div>
      } @else { <div class="loading">Loading…</div> }
    </div>`,
  styles: [`.narrow { max-width: 920px; }`]
})
export class AlgorithmDetailComponent {
  private api = inject(ApiService);
  private router=inject(Router);
  remove(){const a=this.a();if(a&&confirm('Delete this algorithm?'))this.api.deleteAlgorithm(a.slug).subscribe(()=>this.router.navigate(['/algorithms']));}
  readonly slug = input.required<string>();
  readonly a = signal<AlgorithmDetail | null>(null);
  readonly showCode = signal(true);
  readonly copied = signal(false);
  private readonly code = computed(() => (this.a()?.implementation ?? '').replace(/^```\w*\n?|```$/gm, '').trim());

  constructor() { effect(() => { const s = this.slug(); this.api.algorithm(s).subscribe(a => { this.a.set(a); this.copied.set(false); }); }); }

  copy(): void { navigator.clipboard?.writeText(this.code()).then(() => this.copied.set(true)); }
}
