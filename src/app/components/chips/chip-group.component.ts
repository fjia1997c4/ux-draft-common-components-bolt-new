import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChipComponent } from './chip.component';
import { ChipOption, ChipSize, ChipColor, ChipVariant } from './chip.types';
import { AccessibilityService } from '../../services/accessibility.service';

@Component({
  selector: 'app-chip-group',
  standalone: true,
  imports: [CommonModule, ChipComponent],
  template: `
    <div 
      class="chip-group"
      [class.wrap]="wrap"
      [class.vertical]="direction === 'vertical'"
      [attr.role]="'group'"
      [attr.aria-label]="ariaLabel"
      [attr.aria-describedby]="ariaDescribedBy"
    >
      <div *ngIf="label" class="chip-group-label">
        {{ label }}
      </div>
      
      <div class="chip-group-container">
        <app-chip
          *ngFor="let chip of chips; trackBy: trackByChipId"
          [id]="chip.id"
          [label]="chip.label"
          [value]="chip.value"
          [size]="size"
          [color]="color"
          [variant]="variant"
          [dismissible]="chip.dismissible ?? dismissible"
          [hasIcon]="!!chip.icon"
          [icon]="chip.icon ?? ''"
          [disabled]="chip.disabled ?? false"
          [selected]="isSelected(chip)"
          (click)="onChipClick(chip, $event)"
          (dismiss)="onChipDismiss(chip, $event)"
        />
      </div>
      
      <div *ngIf="errorMessage" class="chip-group-error">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styleUrls: ['./chip-group.component.css']
})
export class ChipGroupComponent implements OnInit, OnDestroy {
  @Input() groupId: string = `chip-group-${Math.random().toString(36).substr(2, 9)}`;
  @Input() label: string = '';
  @Input() chips: ChipOption[] = [];
  @Input() size: ChipSize = 'medium';
  @Input() color: ChipColor = 'default';
  @Input() variant: ChipVariant = 'filled';
  @Input() dismissible: boolean = false;
  @Input() multiSelect: boolean = false;
  @Input() wrap: boolean = true;
  @Input() direction: 'horizontal' | 'vertical' = 'horizontal';
  @Input() maxSelection: number = Infinity;
  @Input() minSelection: number = 0;
  @Input() errorMessage: string = '';
  @Input() ariaLabel: string = '';
  @Input() ariaDescribedBy: string = '';

  @Output() selectionChange = new EventEmitter<ChipOption[]>();
  @Output() chipClick = new EventEmitter<ChipOption>();
  @Output() chipDismiss = new EventEmitter<ChipOption>();
  @Output() validationChange = new EventEmitter<boolean>();

  selectedChips: ChipOption[] = [];

  constructor(private accessibilityService: AccessibilityService) {}

  ngOnInit(): void {
    this.validateConfiguration();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  trackByChipId(index: number, chip: ChipOption): string {
    return chip.id;
  }

  isSelected(chip: ChipOption): boolean {
    return this.selectedChips.some(selected => selected.id === chip.id);
  }

  onChipClick(chip: ChipOption, event: any): void {
    if (chip.disabled) return;

    if (this.multiSelect) {
      this.toggleChipSelection(chip);
    } else {
      this.selectSingleChip(chip);
    }

    this.chipClick.emit(chip);
    this.validateSelection();
  }

  onChipDismiss(chip: ChipOption, event: any): void {
    if (chip.disabled) return;

    // Remove from chips array
    this.chips = this.chips.filter(c => c.id !== chip.id);
    
    // Remove from selection if selected
    this.selectedChips = this.selectedChips.filter(c => c.id !== chip.id);
    
    this.chipDismiss.emit(chip);
    this.selectionChange.emit([...this.selectedChips]);
    this.validateSelection();
    
    // Announce removal
    this.accessibilityService.announce(`${chip.label} chip removed`);
  }

  private toggleChipSelection(chip: ChipOption): void {
    const isCurrentlySelected = this.isSelected(chip);
    
    if (isCurrentlySelected) {
      // Remove from selection
      this.selectedChips = this.selectedChips.filter(c => c.id !== chip.id);
    } else {
      // Add to selection if under max limit
      if (this.selectedChips.length < this.maxSelection) {
        this.selectedChips.push(chip);
      } else {
        this.accessibilityService.announce(`Maximum ${this.maxSelection} chips can be selected`);
        return;
      }
    }
    
    this.selectionChange.emit([...this.selectedChips]);
  }

  private selectSingleChip(chip: ChipOption): void {
    this.selectedChips = [chip];
    this.selectionChange.emit([...this.selectedChips]);
  }

  private validateSelection(): void {
    const selectedCount = this.selectedChips.length;
    const isValid = selectedCount >= this.minSelection && selectedCount <= this.maxSelection;
    this.validationChange.emit(isValid);
  }

  private validateConfiguration(): void {
    // Validate small chip constraints
    if (this.size === 'small') {
      this.chips.forEach(chip => {
        if (chip.icon) {
          console.warn(`Small chip "${chip.label}" cannot have an icon`);
        }
        if (chip.dismissible) {
          console.warn(`Small chip "${chip.label}" cannot be dismissible`);
        }
        
        // Check word count
        const wordCount = chip.label.trim().split(/\s+/).length;
        if (wordCount > 2) {
          console.warn(`Small chip "${chip.label}" should have maximum 2 words`);
        }
      });
    }

    // Validate large chip constraints
    if (this.size === 'large') {
      this.chips.forEach(chip => {
        if (chip.icon && (chip.dismissible ?? this.dismissible)) {
          console.warn(`Large chip "${chip.label}" cannot have both icon and dismiss button`);
        }
      });
    }
  }

  // Public API methods
  selectAll(): void {
    if (!this.multiSelect) return;
    
    const selectableChips = this.chips.filter(chip => !chip.disabled);
    const maxSelectable = Math.min(selectableChips.length, this.maxSelection);
    
    this.selectedChips = selectableChips.slice(0, maxSelectable);
    this.selectionChange.emit([...this.selectedChips]);
    this.validateSelection();
  }

  deselectAll(): void {
    this.selectedChips = [];
    this.selectionChange.emit([...this.selectedChips]);
    this.validateSelection();
  }

  addChip(chip: ChipOption): void {
    if (!this.chips.find(c => c.id === chip.id)) {
      this.chips.push(chip);
    }
  }

  removeChip(chipId: string): void {
    this.chips = this.chips.filter(c => c.id !== chipId);
    this.selectedChips = this.selectedChips.filter(c => c.id !== chipId);
    this.selectionChange.emit([...this.selectedChips]);
    this.validateSelection();
  }

  getSelectedValues(): any[] {
    return this.selectedChips.map(chip => chip.value);
  }

  getSelectedCount(): number {
    return this.selectedChips.length;
  }

  isValid(): boolean {
    const selectedCount = this.selectedChips.length;
    return selectedCount >= this.minSelection && selectedCount <= this.maxSelection;
  }
}