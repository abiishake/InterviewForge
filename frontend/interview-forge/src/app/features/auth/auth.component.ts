import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
@Component({selector:'app-auth',imports:[FormsModule],template:`
<div class="page" style="max-width:520px;margin:auto"><div class="eyebrow">InterviewForge</div><h1>{{signup()?'Create account':'Sign in'}}</h1>
<form (ngSubmit)="submit()" class="stack mt">
<label>Username<input name="username" [(ngModel)]="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9._-]+" autocomplete="username" autocapitalize="none"></label>
@if(signup()){<label>Name<input name="name" [(ngModel)]="name" required maxlength="80" autocomplete="name"></label>
<label>Email<input name="email" type="email" [(ngModel)]="email" required maxlength="254" autocomplete="email"></label>}
<label>Password<input name="password" type="password" [(ngModel)]="password" required [minlength]="signup()?12:1" maxlength="128" [autocomplete]="signup()?'new-password':'current-password'"></label>
@if(error()){<p class="field-error" role="alert">{{error()}}</p>}
<button class="btn primary" [disabled]="busy()">{{busy()?'Please wait…':signup()?'Create account':'Sign in'}}</button>
<button class="btn ghost" type="button" (click)="signup.set(!signup());error.set('')">{{signup()?'Already registered? Sign in':'Create an account'}}</button>
</form></div>`})
export class AuthComponent {
 readonly auth=inject(AuthService);private router=inject(Router);private route=inject(ActivatedRoute);
 readonly signup=signal(false);readonly busy=signal(false);readonly error=signal('');username='';name='';email='';password='';
 async submit(){this.busy.set(true);this.error.set('');try {if(this.signup())await this.auth.register(this.username,this.name,this.email,this.password);else await this.auth.login(this.username,this.password);this.password='';const url=this.route.snapshot.queryParamMap.get('returnUrl')??'/';await this.router.navigateByUrl(url.startsWith('/')&&!url.startsWith('//')?url:'/');}catch(e){this.error.set((e as {message?:string}).message??'Sign in failed.');}finally{this.busy.set(false);}}
}
