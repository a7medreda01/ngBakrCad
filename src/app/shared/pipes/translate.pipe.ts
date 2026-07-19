import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../../core/services/translation.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Enables re-evaluation when language signals toggle
})
export class TranslatePipe implements PipeTransform {
  private readonly translationService = inject(TranslationService);

  transform(value: string): string {
    if (!value) return '';
    return this.translationService.translate(value);
  }
}
