import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
@Component({selector:'app-feedback-form',imports:[FormsModule],template:`
<details class="mt"><summary>Suggest a change / send feedback</summary><form (ngSubmit)="send()" class="stack mt">
<label>Feedback<textarea name="feedback" rows="4" [(ngModel)]="message" required maxlength="10000"></textarea></label>
<button class="btn" [disabled]="busy() || !message.trim()">Send to administrator</button>
@if(sent()){<p class="muted" role="status">Feedback submitted for review.</p>}
</form></details>`})
export class FeedbackFormComponent {readonly kind=input.required<string>();readonly contentId=input.required<number>();private api=inject(ApiService);message='';readonly busy=signal(false);readonly sent=signal(false);
 send(){this.busy.set(true);this.api.sendFeedback(this.kind(),this.contentId(),this.message).subscribe({next:()=>{this.message='';this.busy.set(false);this.sent.set(true);},error:()=>this.busy.set(false)});}}
