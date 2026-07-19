import { Component, input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <div class="w-full flex flex-col gap-1.5">
      @if (label()) {
        <label [for]="id()" class="input-label">{{ label() }}</label>
      }
      <div class="relative flex items-center">
        @if (icon()) {
          <span class="absolute start-3.5 text-text-muted pointer-events-none">
            <i [class]="icon()"></i>
          </span>
        }
        <input
          [id]="id()"
          [type]="type()"
          [placeholder]="placeholder()"
          [disabled]="disabled"
          [value]="value"
          (input)="onInputChange($event)"
          (blur)="onBlur()"
          [class]="icon() ? 'input-field ps-10' : 'input-field'"
          [class.border-error]="error()"
          [class.focus:ring-error/20]="error()"
          [class.focus:border-error]="error()"
        />
      </div>
      @if (hint() && !error()) {
        <span class="text-xs text-text-muted">{{ hint() }}</span>
      }
      @if (error()) {
        <span class="input-error">{{ error() }}</span>
      }
    </div>
  `
})
export class InputComponent implements ControlValueAccessor {
  id = input<string>('input-' + Math.random().toString(36).substring(2, 9));
  label = input<string | null>(null);
  type = input<string>('text');
  placeholder = input<string>('');
  hint = input<string | null>(null);
  icon = input<string | null>(null);
  error = input<string | null>(null);

  value = '';
  disabled = false;

  onChange: (value: string) => void = () => {};
  onTouch: () => void = () => {};

  writeValue(val: string): void {
    this.value = val || '';
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouch = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value = val;
    this.onChange(val);
  }

  onBlur(): void {
    this.onTouch();
  }
}
