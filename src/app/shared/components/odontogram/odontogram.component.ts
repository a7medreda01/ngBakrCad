import { Component, input, output, model, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * FDI / ISO-3950 Two-Digit Numbering System, matches the reference chart:
 * Upper arch  : 18...11 (patient's right, UR 3rd molar -> UR central) |
 *               21...28 (patient's left, UL central -> UL 3rd molar)
 * Lower arch  : 48...41 (patient's right, LR 3rd molar -> LR central) |
 *               31...38 (patient's left, LL central -> LL 3rd molar)
 * First digit = quadrant (1 UR, 2 UL, 3 LL, 4 LR), second digit = position
 * from the midline (1 central incisor ... 8 third molar).
 */
export type ToothType = 'central-incisor' | 'lateral-incisor' | 'canine' | 'premolar' | 'molar';

export interface RenderedTooth {
  num: number;
  type: ToothType;
  jaw: 'upper' | 'lower';
  x: number;          // center x inside the SVG viewBox
  y: number;          // center y inside the SVG viewBox
  rotation: number;   // degrees, crown pointing outward from the arch center
  scale: number;      // relative crown size
  labelX: number;
  labelY: number;
}

// Real anatomical crown/root outlines with better 3D appearance and grooves
const TOOTH_PATHS: Record<ToothType, { crown: string; groove: string; shadow: string }> = {
  'central-incisor': {
    crown: 'M -12,-16 C -14,-26 -8,-32 0,-32 C 8,-32 14,-26 12,-16 L 11,-1 C 10,10 6,22 0,30 C -6,22 -10,10 -11,-1 Z',
    groove: 'M 0,-28 L 0,10',
    shadow: 'M -12,-16 C -6,-22 6,-22 12,-16'
  },
  'lateral-incisor': {
    crown: 'M -10.5,-15 C -12,-24 -6,-30 0,-30 C 6,-30 12,-24 10.5,-15 L 9,-1 C 8,8 4,18 0,28 C -4,18 -8,8 -9,-1 Z',
    groove: 'M 0,-26 L 0,8',
    shadow: 'M -10.5,-15 C -5,-21 5,-21 10.5,-15'
  },
  canine: {
    crown: 'M -12,-12 L 0,-32 L 12,-12 C 14,-2 12,8 6,20 L 0,30 L -6,20 C -12,8 -14,-2 -12,-12 Z',
    groove: 'M -4,-20 L 0,-6 M 4,-20 L 0,-6',
    shadow: 'M -12,-12 C -5,-20 5,-20 12,-12'
  },
  premolar: {
    crown: 'M -14,-19 C -16,-27 -10,-31 0,-29 C 10,-31 16,-27 14,-19 C 16,-10 14,4 8,14 C 5,20 2,25 0,29 C -2,25 -5,20 -8,14 C -14,4 -16,-10 -14,-19 Z',
    groove: 'M -7,-17 C -3,-12 3,-12 7,-17 M 0,-14 L 0,10',
    shadow: 'M -14,-19 C -7,-25 7,-25 14,-19 M -4,-8 C 0,-4 0,-4 4,-8'
  },
  molar: {
    crown: 'M -18,-17 C -20,-26 -13,-31 -4,-30 C 4,-31 13,-26 18,-17 C 20,-8 18,5 13,14 C 11,19 6,24 0,27 C -6,24 -11,19 -13,14 C -18,5 -20,-8 -18,-17 Z',
    groove: 'M -9,-15 C -4,-10 4,-10 9,-15 M -6,0 C -2,5 2,5 6,0 M 0,-21 L 0,-13',
    shadow: 'M -18,-17 C -9,-23 9,-23 18,-17 M -7,6 C 0,8 0,8 7,6'
  }
};

// Enhanced record with shadow path
interface ToothPathDef {
  crown: string;
  groove: string;
  shadow: string;
}

// Relative crown scale per tooth type so molars read bigger than incisors.
const TOOTH_SCALE: Record<ToothType, number> = {
  'central-incisor': 0.85,
  'lateral-incisor': 0.75,
  canine: 0.9,
  premolar: 0.85,
  molar: 1
};

// FDI notation: the last digit of the tooth number determines its type,
// regardless of quadrant (1 central-incisor, 2 lateral-incisor, 3 canine,
// 4/5 premolars, 6/7/8 molars).
const POSITION_TO_TYPE: Record<number, ToothType> = {
  1: 'central-incisor',
  2: 'lateral-incisor',
  3: 'canine',
  4: 'premolar',
  5: 'premolar',
  6: 'molar',
  7: 'molar',
  8: 'molar'
};

const ALL_FDI_NUMBERS: number[] = [
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48
];

const TOOTH_TYPE_BY_NUM: Record<number, ToothType> = ALL_FDI_NUMBERS.reduce((acc, num) => {
  acc[num] = POSITION_TO_TYPE[num % 10];
  return acc;
}, {} as Record<number, ToothType>);

// Clockwise ring order around the arch, starting at 12 o'clock (tooth 21) --
// this reproduces the classic horseshoe/oval FDI chart layout exactly:
// upper-left (21->28), lower-left (38->31), lower-right (41->48), upper-right (18->11).
const RING_ORDER: number[] = [
  21, 22, 23, 24, 25, 26, 27, 28,
  38, 37, 36, 35, 34, 33, 32, 31,
  41, 42, 43, 44, 45, 46, 47, 48,
  18, 17, 16, 15, 14, 13, 12, 11
];

@Component({
  selector: 'app-odontogram',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './odontogram.component.html',
  styleUrl: './odontogram.component.scss'
})
export class OdontogramComponent {
  // Input: Pricing mode (PerTooth, PerArch, etc.)
  pricingMethod = input<number>(0);

  // Read-only mode for displaying selected teeth in order details
  readOnly = input<boolean>(false);

  // Selected teeth numbers (two-way binding via model)
  selectedTeeth = model<number[]>([]);

  // Selection events
  toothToggled = output<number>();

  // FDI numbering, kept for arch-level actions
  readonly upperArch = [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28];
  readonly lowerArch = [31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48];

  // Chart geometry (SVG viewBox is 0 0 600 700) - wider and taller
  private readonly cx = 300;
  private readonly cy = 350;
  private readonly rx = 190;
  private readonly ry = 260;
  private readonly labelPad = 38;
  private readonly archGap = 50; // Gap between upper and lower arch

  readonly toothPaths = TOOTH_PATHS;

  readonly teeth = computed<RenderedTooth[]>(() => {
    const step = 360 / RING_ORDER.length;
    return RING_ORDER.map((num, index) => {
      const angleDeg = index * step; // 0 = 12 o'clock, clockwise
      const angleRad = (angleDeg * Math.PI) / 180;
      const type = TOOTH_TYPE_BY_NUM[num];
      const quadrant = Math.floor(num / 10);
      const jaw: 'upper' | 'lower' = (quadrant === 1 || quadrant === 2) ? 'upper' : 'lower';

      const sin = Math.sin(angleRad);
      const cos = Math.cos(angleRad);

      // Add gap between upper and lower arch
      const archOffset = jaw === 'upper' ? -this.archGap / 2 : this.archGap / 2;

      const x = this.cx + this.rx * sin;
      const y = this.cy - this.ry * cos + archOffset;

      const labelX = this.cx + (this.rx + this.labelPad) * sin;
      const labelY = this.cy - (this.ry + this.labelPad) * cos + archOffset;

      return {
        num,
        type,
        jaw,
        x,
        y,
        rotation: angleDeg,
        scale: TOOTH_SCALE[type],
        labelX,
        labelY
      };
    });
  });

  trackByNum(_: number, tooth: RenderedTooth): number {
    return tooth.num;
  }

  isToothSelected(num: number): boolean {
    return this.selectedTeeth().includes(num);
  }

  toggleTooth(num: number): void {
    if (this.readOnly()) {
      return;
    }

    const current = [...this.selectedTeeth()];
    const index = current.indexOf(num);

    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(num);
    }

    this.selectedTeeth.set(current);
    this.toothToggled.emit(num);
  }

  selectUpperArch(): void {
    if (this.readOnly()) {
      return;
    }

    const current = [...this.selectedTeeth()];
    const otherTeeth = current.filter(t => !this.upperArch.includes(t));

    const allUpperSelected = this.upperArch.every(t => current.includes(t));
    if (allUpperSelected) {
      this.selectedTeeth.set(otherTeeth);
    } else {
      this.selectedTeeth.set([...otherTeeth, ...this.upperArch]);
    }
  }

  selectLowerArch(): void {
    if (this.readOnly()) {
      return;
    }

    const current = [...this.selectedTeeth()];
    const otherTeeth = current.filter(t => !this.lowerArch.includes(t));

    const allLowerSelected = this.lowerArch.every(t => current.includes(t));
    if (allLowerSelected) {
      this.selectedTeeth.set(otherTeeth);
    } else {
      this.selectedTeeth.set([...otherTeeth, ...this.lowerArch]);
    }
  }

  clearAll(): void {
    if (this.readOnly()) {
      return;
    }

    this.selectedTeeth.set([]);
  }
}