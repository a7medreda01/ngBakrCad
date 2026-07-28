import { Component, input, output, model, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DetailedToothType =
  | 'upper-central'
  | 'upper-lateral'
  | 'upper-canine'
  | 'upper-premolar'
  | 'upper-molar'
  | 'lower-central'
  | 'lower-lateral'
  | 'lower-canine'
  | 'lower-premolar'
  | 'lower-molar-5cusp'
  | 'lower-molar-4cusp';

export interface ToothPathDefinition {
  crown: string;
  fissure: string;
  pits?: string;
  highlight: string;
  innerShadow?: string;
}

export interface RenderedTooth {
  num: number;
  type: DetailedToothType;
  jaw: 'upper' | 'lower';
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  labelX: number;
  labelY: number;
  pathDef: ToothPathDefinition;
}

/**
 * Hyper-detailed anatomical 2D/3D occlusal tooth paths matching natural human dental anatomy
 * and porcelain ceramic shading from reference CAD / dental photography.
 */
const DETAILED_PATHS: Record<DetailedToothType, ToothPathDefinition> = {
  'upper-central': {
    crown:
      'M -18,-13 C -18,-24 -10,-28 0,-28 C 10,-28 18,-24 18,-13 C 18,-2 14,10 10,16 C 6,21 3,22 0,22 C -3,22 -6,21 -10,16 C -14,10 -18,-2 -18,-13 Z',
    fissure:
      'M -11,-9 C -6,-16 6,-16 11,-9 M -5,-18 C -5,-4 -4,6 -4,12 M 5,-18 C 5,-4 4,6 4,12 M 0,-22 C 0,-10 0,8 0,16',
    highlight:
      'M -14,-18 C -8,-23 8,-23 14,-18 C 10,-12 -10,-12 -14,-18 Z',
    innerShadow:
      'M -11,13 C -6,18 6,18 11,13 C 14,8 16,-2 16,-10'
  },
  'upper-lateral': {
    crown:
      'M -15,-12 C -15,-22 -8,-25 0,-25 C 8,-25 15,-22 15,-12 C 15,-2 12,8 8,14 C 5,18 2,19 0,19 C -2,19 -5,18 -8,14 C -12,8 -15,-2 -15,-12 Z',
    fissure:
      'M -9,-8 C -5,-14 5,-14 9,-8 M -3,-16 C -3,-2 -2,6 -2,11 M 3,-16 C 3,-2 2,6 2,11 M 0,-20 L 0,13',
    highlight:
      'M -11,-15 C -6,-20 6,-20 11,-15 C 8,-10 -8,-10 -11,-15 Z',
    innerShadow:
      'M -8,12 C -4,16 4,16 8,12'
  },
  'upper-canine': {
    crown:
      'M -18,-7 C -18,-18 -10,-24 0,-24 C 10,-24 18,-18 18,-7 C 18,3 12,13 0,21 C -12,13 -18,3 -18,-7 Z',
    fissure:
      'M -11,-8 L 0,14 L 11,-8 M 0,-20 L 0,14 M -7,-3 C -3,4 3,4 7,-3',
    highlight:
      'M -13,-14 C -7,-19 7,-19 13,-14 C 9,-8 -9,-8 -13,-14 Z',
    innerShadow:
      'M -11,11 C -5,17 5,17 11,11'
  },
  'upper-premolar': {
    crown:
      'M -19,-14 C -19,-23 -11,-26 0,-26 C 11,-26 19,-23 19,-14 C 19,-5 16,6 11,13 C 7,18 2,19 0,19 C -2,19 -7,18 -11,13 C -16,6 -19,-5 -19,-14 Z',
    fissure:
      'M -12,-3 C -4,2 4,2 12,-3 M -8,-10 C -12,-3 -8,4 -6,7 M 8,-10 C 12,-3 8,4 6,7 M 0,-20 L 0,12',
    pits:
      'M -12,-3 A 1.2 1.2 0 1 0 -12,-2.9 M 12,-3 A 1.2 1.2 0 1 0 12,-2.9',
    highlight:
      'M -14,-18 C -7,-22 7,-22 14,-18 C 9,-12 -9,-12 -14,-18 Z',
    innerShadow:
      'M -12,11 C -6,16 6,16 12,11'
  },
  'upper-molar': {
    crown:
      'M -23,-18 C -23,-28 -12,-31 0,-31 C 12,-31 23,-28 23,-18 C 23,-8 20,8 14,17 C 8,23 2,24 0,24 C -2,24 -8,23 -14,17 C -20,8 -23,-8 -23,-18 Z',
    fissure:
      'M -12,-12 C -4,-4 0,0 0,-25 M 0,0 C 4,6 8,12 12,16 M -16,-6 C -6,-2 6,2 14,-2 M -12,10 C -4,6 4,6 10,12 M -18,-12 L -12,-6 L -16,0 M 18,-12 L 12,-6 L 16,0',
    pits:
      'M 0,0 A 1.5 1.5 0 1 0 0,0.1 M -12,-12 A 1.2 1.2 0 1 0 -12,-11.9 M 12,16 A 1.2 1.2 0 1 0 12,16.1',
    highlight:
      'M -18,-21 C -9,-26 9,-26 18,-21 C 12,-14 -12,-14 -18,-21 Z',
    innerShadow:
      'M -14,15 C -7,21 7,21 14,15'
  },
  'lower-central': {
    crown:
      'M -12,-11 C -12,-17 -7,-20 0,-20 C 7,-20 12,-17 11,-11 C 10,-3 8,6 5,12 C 3,15 1,16 0,16 C -1,16 -3,15 -5,12 C -8,6 -10,-3 -12,-11 Z',
    fissure:
      'M -7,-7 C -4,-12 4,-12 7,-7 M 0,-15 L 0,8',
    highlight:
      'M -8,-14 C -4,-17 4,-17 8,-14 C 5,-9 -5,-9 -8,-14 Z',
    innerShadow:
      'M -5,11 C -2,14 2,14 5,11'
  },
  'lower-lateral': {
    crown:
      'M -14,-11 C -14,-18 -8,-21 0,-21 C 8,-21 14,-18 13,-11 C 12,-3 9,7 6,13 C 3,16 1,17 0,17 C -1,17 -3,16 -6,13 C -9,7 -12,-3 -14,-11 Z',
    fissure:
      'M -8,-8 C -4,-13 4,-13 8,-8 M 0,-16 L 0,9',
    highlight:
      'M -9,-15 C -4,-18 4,-18 9,-15 C 6,-10 -6,-10 -9,-15 Z',
    innerShadow:
      'M -6,12 C -3,15 3,15 6,12'
  },
  'lower-canine': {
    crown:
      'M -16,-8 C -16,-16 -9,-21 0,-21 C 9,-21 16,-16 16,-8 C 16,1 10,10 0,18 C -10,10 -16,1 -16,-8 Z',
    fissure:
      'M -10,-7 L 0,12 L 10,-7 M 0,-16 L 0,12',
    highlight:
      'M -11,-14 C -5,-18 5,-18 11,-14 C 7,-8 -7,-8 -11,-14 Z',
    innerShadow:
      'M -8,11 C -4,15 4,15 8,11'
  },
  'lower-premolar': {
    crown:
      'M -17,-13 C -17,-22 -9,-25 0,-25 C 9,-25 17,-22 17,-13 C 17,-4 14,7 10,14 C 6,18 2,19 0,19 C -2,19 -6,18 -10,14 C -14,7 -17,-4 -17,-13 Z',
    fissure:
      'M -9,-3 C -3,3 3,3 9,-3 M 0,-18 L 0,12 M -6,-10 L -9,-3 M 6,-10 L 9,-3',
    pits:
      'M -9,-3 A 1.2 1.2 0 1 0 -9,-2.9 M 9,-3 A 1.2 1.2 0 1 0 9,-2.9',
    highlight:
      'M -12,-17 C -6,-21 6,-21 12,-17 C 8,-11 -8,-11 -12,-17 Z',
    innerShadow:
      'M -10,12 C -5,16 5,16 10,12'
  },
  'lower-molar-5cusp': {
    crown:
      'M -24,-17 C -24,-27 -12,-30 0,-30 C 12,-30 24,-27 24,-17 C 24,-7 20,9 14,18 C 8,24 2,25 0,25 C -2,25 -8,24 -14,18 C -20,9 -24,-7 -24,-17 Z',
    fissure:
      'M 0,-2 C -6,-10 -12,-16 -14,-20 M 0,-2 C 6,-10 12,-16 14,-20 M 0,-2 L 0,18 M 0,-2 L -18,-4 M 0,-2 L 18,-4 M -12,8 L 0,18 L 12,8',
    pits:
      'M 0,-2 A 1.5 1.5 0 1 0 0,-1.9 M -14,-20 A 1.1 1.1 0 1 0 -14,-19.9 M 14,-20 A 1.1 1.1 0 1 0 14,-19.9',
    highlight:
      'M -19,-21 C -9,-26 9,-26 19,-21 C 12,-14 -12,-14 -19,-21 Z',
    innerShadow:
      'M -14,16 C -7,22 7,22 14,16'
  },
  'lower-molar-4cusp': {
    crown:
      'M -22,-16 C -22,-26 -11,-28 0,-28 C 11,-28 22,-26 22,-16 C 22,-6 18,8 13,17 C 7,23 2,24 0,24 C -2,24 -7,23 -13,17 C -18,8 -22,-6 -22,-16 Z',
    fissure:
      'M 0,-22 L 0,18 M -18,-2 L 18,-2 M -10,-14 L -18,-2 L -10,10 M 10,-14 L 18,-2 L 10,10',
    pits:
      'M 0,-2 A 1.5 1.5 0 1 0 0,-1.9',
    highlight:
      'M -17,-20 C -8,-25 8,-25 17,-20 C 11,-13 -11,-13 -17,-20 Z',
    innerShadow:
      'M -13,15 C -6,21 6,21 13,15'
  }
};

/**
 * Exact millimeter anatomical placement for all 32 FDI teeth to perfectly reproduce
 * the reference image layout.
 */
interface ToothPlacement {
  num: number;
  type: DetailedToothType;
  jaw: 'upper' | 'lower';
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

const TOOTH_PLACEMENTS: ToothPlacement[] = [
  // --- UPPER ARCH (Left to Right in viewer display: 18 -> 11, then 21 -> 28) ---
  { num: 18, type: 'upper-molar', jaw: 'upper', x: 158, y: 348, rotation: -92, scaleX: 1.0, scaleY: 1.0 },
  { num: 17, type: 'upper-molar', jaw: 'upper', x: 156, y: 296, rotation: -90, scaleX: 1.1, scaleY: 1.08 },
  { num: 16, type: 'upper-molar', jaw: 'upper', x: 160, y: 242, rotation: -86, scaleX: 1.18, scaleY: 1.14 },
  { num: 15, type: 'upper-premolar', jaw: 'upper', x: 172, y: 192, rotation: -78, scaleX: 1.0, scaleY: 0.98 },
  { num: 14, type: 'upper-premolar', jaw: 'upper', x: 192, y: 152, rotation: -65, scaleX: 0.98, scaleY: 0.95 },
  { num: 13, type: 'upper-canine', jaw: 'upper', x: 222, y: 120, rotation: -42, scaleX: 1.02, scaleY: 1.02 },
  { num: 12, type: 'upper-lateral', jaw: 'upper', x: 260, y: 100, rotation: -22, scaleX: 0.92, scaleY: 0.95 },
  { num: 11, type: 'upper-central', jaw: 'upper', x: 302, y: 92, rotation: -8, scaleX: 1.08, scaleY: 1.08 },

  { num: 21, type: 'upper-central', jaw: 'upper', x: 348, y: 92, rotation: 8, scaleX: 1.08, scaleY: 1.08 },
  { num: 22, type: 'upper-lateral', jaw: 'upper', x: 390, y: 100, rotation: 22, scaleX: 0.92, scaleY: 0.95 },
  { num: 23, type: 'upper-canine', jaw: 'upper', x: 428, y: 120, rotation: 42, scaleX: 1.02, scaleY: 1.02 },
  { num: 24, type: 'upper-premolar', jaw: 'upper', x: 458, y: 152, rotation: 65, scaleX: 0.98, scaleY: 0.95 },
  { num: 25, type: 'upper-premolar', jaw: 'upper', x: 478, y: 192, rotation: 78, scaleX: 1.0, scaleY: 0.98 },
  { num: 26, type: 'upper-molar', jaw: 'upper', x: 490, y: 242, rotation: 86, scaleX: 1.18, scaleY: 1.14 },
  { num: 27, type: 'upper-molar', jaw: 'upper', x: 494, y: 296, rotation: 90, scaleX: 1.1, scaleY: 1.08 },
  { num: 28, type: 'upper-molar', jaw: 'upper', x: 492, y: 348, rotation: 92, scaleX: 1.0, scaleY: 1.0 },

  // --- LOWER ARCH (Left to Right in viewer display: 48 -> 41, then 31 -> 38) ---
  { num: 48, type: 'lower-molar-4cusp', jaw: 'lower', x: 162, y: 422, rotation: 88, scaleX: 0.98, scaleY: 0.98 },
  { num: 47, type: 'lower-molar-4cusp', jaw: 'lower', x: 162, y: 480, rotation: 90, scaleX: 1.08, scaleY: 1.05 },
  { num: 46, type: 'lower-molar-5cusp', jaw: 'lower', x: 168, y: 538, rotation: 94, scaleX: 1.18, scaleY: 1.12 },
  { num: 45, type: 'lower-premolar', jaw: 'lower', x: 182, y: 592, rotation: 102, scaleX: 0.96, scaleY: 0.95 },
  { num: 44, type: 'lower-premolar', jaw: 'lower', x: 204, y: 636, rotation: 115, scaleX: 0.94, scaleY: 0.92 },
  { num: 43, type: 'lower-canine', jaw: 'lower', x: 236, y: 672, rotation: 138, scaleX: 0.98, scaleY: 0.98 },
  { num: 42, type: 'lower-lateral', jaw: 'lower', x: 272, y: 692, rotation: 158, scaleX: 0.9, scaleY: 0.92 },
  { num: 41, type: 'lower-central', jaw: 'lower', x: 308, y: 698, rotation: 172, scaleX: 0.88, scaleY: 0.9 },

  { num: 31, type: 'lower-central', jaw: 'lower', x: 342, y: 698, rotation: 188, scaleX: 0.88, scaleY: 0.9 },
  { num: 32, type: 'lower-lateral', jaw: 'lower', x: 378, y: 692, rotation: 202, scaleX: 0.9, scaleY: 0.92 },
  { num: 33, type: 'lower-canine', jaw: 'lower', x: 414, y: 672, rotation: 222, scaleX: 0.98, scaleY: 0.98 },
  { num: 34, type: 'lower-premolar', jaw: 'lower', x: 446, y: 636, rotation: 245, scaleX: 0.94, scaleY: 0.92 },
  { num: 35, type: 'lower-premolar', jaw: 'lower', x: 468, y: 592, rotation: 258, scaleX: 0.96, scaleY: 0.95 },
  { num: 36, type: 'lower-molar-5cusp', jaw: 'lower', x: 482, y: 538, rotation: 266, scaleX: 1.18, scaleY: 1.12 },
  { num: 37, type: 'lower-molar-4cusp', jaw: 'lower', x: 488, y: 480, rotation: 270, scaleX: 1.08, scaleY: 1.05 },
  { num: 38, type: 'lower-molar-4cusp', jaw: 'lower', x: 488, y: 422, rotation: 272, scaleX: 0.98, scaleY: 0.98 }
];

@Component({
  selector: 'app-odontogram',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './odontogram.component.html',
  styleUrl: './odontogram.component.scss'
})
export class OdontogramComponent {
  // Input: Pricing mode
  pricingMethod = input<number>(0);

  // Read-only mode for displaying selected teeth in order details
  readOnly = input<boolean>(false);

  // Selected teeth numbers (two-way binding via model)
  selectedTeeth = model<number[]>([]);

  // Highlighted teeth for selected service inspection
  highlightedTeeth = input<number[] | null>(null);

  // Selection events
  toothToggled = output<number>();

  // FDI numbering lists
  readonly upperArch = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  readonly lowerArch = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  readonly detailedPaths = DETAILED_PATHS;

  readonly teeth = computed<RenderedTooth[]>(() => {
    return TOOTH_PLACEMENTS.map(p => {
      const pathDef = DETAILED_PATHS[p.type];      return {
        num: p.num,
        type: p.type,
        jaw: p.jaw,
        x: p.x,
        y: p.y,
        rotation: p.rotation,
        scaleX: p.scaleX,
        scaleY: p.scaleY,
        labelX: p.x,
        labelY: p.y,
        pathDef
      };
    });
  });

  trackByNum(_: number, tooth: RenderedTooth): number {
    return tooth.num;
  }

  isToothSelected(num: number): boolean {
    return this.selectedTeeth().includes(num);
  }

  isToothHighlighted(num: number): boolean {
    const hl = this.highlightedTeeth();
    return Array.isArray(hl) && hl.includes(num);
  }

  getToothGradientId(num: number): string {
    if (this.isToothHighlighted(num)) return 'url(#toothGradientHighlightedGold)';
    if (!this.isToothSelected(num)) return 'url(#toothPorcelainBase)';
    return 'url(#toothGradientSelectedRed)';
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
