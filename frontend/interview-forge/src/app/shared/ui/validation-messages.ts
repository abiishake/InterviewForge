import { ValidationErrors } from '@angular/forms';

/** Turns Angular validation errors into one human sentence. `label` is the field's visible name. */
export function validationMessage(errors: ValidationErrors | null | undefined, label: string, patternMessage?: string): string {
  if (!errors) return '';
  if (errors['required']) return `${label} is required.`;
  if (errors['email']) return 'Enter a valid email address.';
  if (errors['minlength']) return `${label} must be at least ${errors['minlength'].requiredLength} characters.`;
  if (errors['maxlength']) return `${label} must be at most ${errors['maxlength'].requiredLength} characters.`;
  if (errors['min']) return `${label} must be at least ${errors['min'].min}.`;
  if (errors['max']) return `${label} must be at most ${errors['max'].max}.`;
  if (errors['pattern']) return patternMessage ?? `${label} is not in a valid format.`;
  return `${label} is not valid.`;
}
