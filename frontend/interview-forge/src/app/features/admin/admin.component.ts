import { Component,inject,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AdminUser,AdminProgress,Feedback } from '../../core/models';
@Component({selector:'app-admin',imports:[FormsModule,RouterLink],template:`<div class="page"><h1>Administration</h1>
<div class="tabs"><button [class.active]="tab()==='feedback'" (click)="tab.set('feedback')">Feedback</button><button [class.active]="tab()==='users'" (click)="tab.set('users')">User progress</button></div>
@if(tab()==='feedback'){@for(f of feedback();track f.id){<article class="card mt"><div class="row"><b>{{f.addedBy}} · {{f.kind}} #{{f.contentId}}</b><span class="badge">{{f.status}}</span><a class="btn sm" [routerLink]="contentLink(f)">Open content</a></div><p style="white-space:pre-wrap">{{f.message}}</p><label>Admin response<textarea rows="2" [(ngModel)]="responses[f.id]"></textarea></label><div class="row mt"><button class="btn ok" (click)="review(f,'Accepted')">Accept</button><button class="btn danger" (click)="review(f,'Rejected')">Reject</button><button class="btn" (click)="review(f,'Pending')">Reopen</button></div></article>}@empty{<p class="muted">No feedback.</p>}}
@if(tab()==='users'){<div class="stack">@for(u of users();track u.id){<div class="row card"><b>{{u.displayName}}</b><span>&#64;{{u.username}}</span><span>{{u.email}}</span><span>{{u.completed}} completed · {{u.reviews}} reviews · {{u.plans}} plans · {{u.contributions}} contributions</span><button class="btn sm" (click)="view(u)">View progress</button></div>}</div>
@if(detail();as d){<h2 class="mt">{{selected()}}</h2><h3>Plans</h3>@for(p of d.plans;track p.id){<p>{{p.name}} · {{p.status}} · {{p.durationDays}} days</p>}@empty{<p>No plans.</p>}<h3>Question progress</h3><div class="stack">@for(p of d.progress;track p.questionId){<div class="row"><a [routerLink]="['/questions',p.questionId]">{{p.question}}</a><span class="badge">{{p.status}}</span><span>{{p.reviewCount}} reviews</span>@if(p.isFavorite){<span>★</span>}</div>}@empty{<p>No progress yet.</p>} </div><h3 class="mt">Recent activity</h3>@for(a of d.activity;track $index){<p>{{a.occurredAt}} · {{a.kind}} · question #{{a.questionId}}</p>}}}
</div>`})
export class AdminComponent {private api=inject(ApiService);readonly tab=signal('feedback');readonly users=signal<AdminUser[]>([]);readonly feedback=signal<Feedback[]>([]);readonly detail=signal<AdminProgress|null>(null);readonly selected=signal('');responses:Record<number,string>={};
 constructor(){this.api.adminUsers().subscribe(u=>this.users.set(u));this.load();}
 load(){this.api.feedback(true).subscribe(f=>{this.feedback.set(f);for(const x of f)this.responses[x.id]=x.adminResponse??'';});}
 review(f:Feedback,status:string){this.api.reviewFeedback(f.id,status,this.responses[f.id]??'').subscribe(()=>this.load());}
 view(u:AdminUser){this.selected.set(u.displayName);this.api.adminProgress(u.id).subscribe(d=>this.detail.set(d));}
 contentLink(f:Feedback):string[]{if(f.kind==='Algorithm')return ['/algorithms'];return ['/'+({Question:'questions',Topic:'topics',Section:'sections'} as Record<string,string>)[f.kind],String(f.contentId)];}}
