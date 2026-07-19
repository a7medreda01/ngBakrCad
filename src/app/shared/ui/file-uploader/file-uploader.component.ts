import { Component, HostListener, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class.drag-over]="isDragOver()"
      class="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 transition-all duration-200 bg-background/50 flex flex-col items-center justify-center gap-3 min-h-[160px]"
      (click)="fileInput.click()"
    >
      <input
        #fileInput
        type="file"
        class="hidden"
        [multiple]="multiple()"
        [accept]="accept()"
        (change)="onFileSelected($event)"
      />

      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 text-primary animate-pulse">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
      </svg>

      <div class="flex flex-col gap-1">
        <p class="text-sm font-bold text-secondary">
          اضغط هنا لرفع الملفات أو اسحبها وأفلتها
        </p>
        <p class="text-xs text-text-secondary">
          يمكنك رفع ملفات بأي صيغة (الحد الأقصى: 80 ميجابايت لكل ملف)
        </p>
      </div>

      <!-- File Queue List -->
      @if (filesQueue().length > 0) {
        <div class="w-full mt-4 flex flex-col gap-2" (click)="$event.stopPropagation()">
          @for (file of filesQueue(); track file.name) {
            <div class="flex items-center justify-between p-2.5 bg-surface border border-border rounded-xl text-left">
              <div class="flex items-center gap-2 overflow-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-text-secondary flex-shrink-0">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span class="text-xs font-bold text-secondary truncate max-w-[200px]">{{ file.name }}</span>
                <span class="text-[10px] text-text-secondary">({{ formatSize(file.size) }})</span>
              </div>
              <button type="button" (click)="removeFile($index)" class="text-red-500 hover:bg-red-50 p-1 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.34 9m-4.78 0L9 9m4 6h-4m9-11h-3.08a4.5 4.5 0 0 0-8.32 0H4.5a.75.75 0 0 0 0 1.5h15a.75.75 0 0 0 0-1.5ZM5.76 6.13a.75.75 0 0 0-.12.5v12.25a2.25 2.25 0 0 0 2.25 2.25h8.22a2.25 2.25 0 0 0 2.25-2.25V6.63a.75.75 0 0 0-.12-.5" />
                </svg>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .drag-over {
      background-color: rgba(45, 141, 179, 0.05);
      border-color: #2D8DB3;
    }
  `]
})
export class FileUploaderComponent {
  multiple = input(false);
  accept = input<string>('*');

  filesSelected = output<File[]>();

  readonly filesQueue = signal<File[]>([]);

  @HostListener('dragover', ['$event'])
  onDragOver(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
    this.isDragOver.set(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
    this.isDragOver.set(false);
  }

  @HostListener('drop', ['$event'])
  onDrop(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
    this.isDragOver.set(false);

    if (evt.dataTransfer?.files) {
      this.addFiles(Array.from(evt.dataTransfer.files));
    }
  }

  readonly isDragOver = signal(false);

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files) {
      this.addFiles(Array.from(inputEl.files));
    }
  }

  addFiles(files: File[]): void {
    if (this.multiple()) {
      this.filesQueue.update(list => [...list, ...files]);
    } else {
      this.filesQueue.set(files.slice(0, 1));
    }
    this.filesSelected.emit(this.filesQueue());
  }

  removeFile(index: number): void {
    this.filesQueue.update(list => {
      const copy = [...list];
      copy.splice(index, 1);
      return copy;
    });
    this.filesSelected.emit(this.filesQueue());
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
