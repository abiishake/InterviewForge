import {
  AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, DestroyRef, Directive, ElementRef, ViewContainerRef,
  computed, effect, inject, input, signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NgControl } from '@angular/forms';
import { validationMessage } from './validation-messages';

/** The visible message, placed right after its input. The directive links it with aria-describedby. */
@Component({
  selector: 'app-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (text()) { <div class="field-error" [id]="errorId()">{{ text() }}</div> }`,
  styles: [`:host { display: block; flex-basis: 100%; }`]
})
export class FieldErrorComponent {
  readonly text = input('');
  readonly errorId = input('');
}

let nextId = 0;

/**
 * Accessible validation for one input that already has ngModel or formControlName:
 *   <input appField="Username" name="username" [(ngModel)]="username" required>
 * Shows a message once the control is invalid and touched (or after validateForm() on submit), or when
 * `serverError` is set; sets aria-invalid and aria-describedby; no other markup needed.
 */
@Directive({
  selector: '[appField]',
  host: {
    '[attr.aria-invalid]': 'message() ? "true" : null',
    '[attr.aria-describedby]': 'describedBy()'
  }
})
export class FieldValidationDirective implements AfterViewInit {
  /** The field's visible name, used in messages ("Username is required."). */
  readonly appField = input.required<string>();
  readonly serverError = input<string | null | undefined>(null);
  readonly patternMessage = input<string | undefined>();
  /** id of a static hint paragraph to keep in aria-describedby. */
  readonly hintId = input<string | null>(null);

  private control = inject(NgControl, { self: true });
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private vcr = inject(ViewContainerRef);
  private destroyRef = inject(DestroyRef);
  readonly errorId = `field-error-${++nextId}`;
  private version = signal(0);
  private errorRef = signal<ComponentRef<FieldErrorComponent> | null>(null);

  readonly message = computed(() => {
    this.version(); // control state is not a signal; bumped from control.events
    const c = this.control.control;
    if (c && c.invalid && c.touched) return validationMessage(c.errors, this.appField(), this.patternMessage());
    return this.serverError() ?? '';
  });
  readonly describedBy = computed(() => [this.hintId(), this.message() ? this.errorId : null].filter(Boolean).join(' ') || null);

  constructor() {
    effect(() => {
      const ref = this.errorRef();
      if (!ref) return;
      ref.setInput('text', this.message());
      ref.setInput('errorId', this.errorId);
    });
  }

  ngAfterViewInit(): void {
    this.errorRef.set(this.vcr.createComponent(FieldErrorComponent));
    this.control.control?.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.version.update(v => v + 1));
    this.version.update(v => v + 1);
  }

  get invalid(): boolean { return !!this.control.control?.invalid; }
  ownedBy(form: AbstractControl): boolean {
    let c: AbstractControl | null = this.control.control;
    while (c?.parent) c = c.parent;
    return c === form;
  }
  focus(): void { this.el.nativeElement.focus(); }
}

/**
 * Call at the start of a submit handler: marks every field touched (so messages appear) and moves focus to
 * the first invalid one. Returns false when the form must not be submitted.
 */
export function validateForm(fields: readonly FieldValidationDirective[], form: AbstractControl): boolean {
  form.markAllAsTouched();
  const first = fields.find(f => f.ownedBy(form) && f.invalid);
  first?.focus();
  return !first && form.valid;
}
