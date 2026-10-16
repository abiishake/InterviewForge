import { Component,effect,inject,input,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router,RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SaveAlgorithm } from '../../core/models';
@Component({selector:'app-algorithm-form',imports:[FormsModule,RouterLink],template:`<div class="page"><h1>{{slug()?'Edit algorithm':'Add algorithm / data structure'}}</h1><form (ngSubmit)="save()" class="stack mt" style="max-width:900px">
@for(f of fields;track f.key){<label [for]="f.key">{{f.label}}</label>@if(f.key==='name'||f.key==='category'||f.key==='timeComplexity'||f.key==='spaceComplexity'){<input [id]="f.key" [name]="f.key" [(ngModel)]="body[f.key]" [required]="f.key==='name'||f.key==='category'">}@else{<textarea [id]="f.key" [name]="f.key" rows="5" [(ngModel)]="body[f.key]"></textarea>}}
<button class="btn primary" [disabled]="busy()">Save algorithm</button><a class="btn" routerLink="/algorithms">Cancel</a></form></div>`})
export class AlgorithmFormComponent {private api=inject(ApiService);private router=inject(Router);readonly slug=input<string>();readonly busy=signal(false);
 body:SaveAlgorithm={name:'',category:'',problemStatement:'',explanation:'',approach:'',timeComplexity:'',spaceComplexity:'',implementation:'',example:'',interviewQuestions:'',commonMistakes:''};
 readonly fields:{key:keyof SaveAlgorithm;label:string}[]=[{key:'name',label:'Name'},{key:'category',label:'Category'},{key:'problemStatement',label:'Problem statement'},{key:'explanation',label:'Explanation'},{key:'approach',label:'Approach'},{key:'timeComplexity',label:'Time complexity'},{key:'spaceComplexity',label:'Space complexity'},{key:'implementation',label:'C# implementation (Markdown)'},{key:'example',label:'Example'},{key:'interviewQuestions',label:'Interview questions'},{key:'commonMistakes',label:'Common mistakes'}];
 constructor(){effect(()=>{const s=this.slug();if(s)this.api.algorithm(s).subscribe(a=>{if(!a.canEdit){this.router.navigate(['/algorithms',s]);return;}for(const f of this.fields)this.body[f.key]=a[f.key];});});}
 save(){this.busy.set(true);const s=this.slug();(s?this.api.updateAlgorithm(s,this.body):this.api.createAlgorithm(this.body)).subscribe({next:a=>this.router.navigate(['/algorithms',a.slug]),error:()=>this.busy.set(false)});}}
