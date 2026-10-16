import { Component,inject,signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Feedback } from '../../core/models';
@Component({selector:'app-feedback',template:`<div class="page"><h1>My feedback</h1>@for(f of items();track f.id){<article class="card mt"><div class="row"><b>{{f.kind}} #{{f.contentId}}</b><span class="badge">{{f.status}}</span></div><p style="white-space:pre-wrap">{{f.message}}</p>@if(f.adminResponse){<p><b>Administrator:</b> {{f.adminResponse}}</p>}</article>}@empty{<p class="muted">No feedback submitted.</p>}</div>`})
export class FeedbackComponent {readonly items=signal<Feedback[]>([]);constructor(){inject(ApiService).feedback().subscribe(f=>this.items.set(f));}}
