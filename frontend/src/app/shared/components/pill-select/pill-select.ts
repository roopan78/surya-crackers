import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule, Check, ChevronDown } from 'lucide-angular';

export interface PillSelectOption {
  value: string;
  label: string;
  /** Tailwind classes for the trigger while this option is chosen. */
  pillClass?: string;
  /** Tailwind background class for the dot beside the option in the list. */
  dotClass?: string;
}

/**
 * A select whose open list we actually control.
 *
 * A native `<select>` can be styled shut but not open: the option list is drawn
 * by the operating system, so it arrives as a plain white box with a blue
 * highlight in the middle of an otherwise designed page. This renders the list
 * itself instead.
 *
 * The panel is positioned `fixed` from the trigger's measured rect rather than
 * absolutely inside it, because these live in a table wrapped in
 * `overflow-x-auto` — and a scroll container on one axis clips the other, which
 * would cut the list off at the row.
 */
@Component({
  selector: 'app-pill-select',
  standalone: true,
  imports: [NgClass, LucideAngularModule],
  templateUrl: './pill-select.html',
})
export class PillSelect {
  readonly options = input.required<PillSelectOption[]>();
  readonly value = input.required<string>();
  /** Extra classes for the closed trigger — the caller's status colouring. */
  readonly triggerClass = input('');
  readonly ariaLabel = input('Select an option');

  readonly valueChange = output<string>();

  readonly CheckIcon = Check;
  readonly ChevronDownIcon = ChevronDown;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  readonly open = signal(false);
  readonly panelTop = signal(0);
  readonly panelLeft = signal(0);
  readonly panelWidth = signal(0);
  /** Which row the keyboard is on; -1 until the user arrows into the list. */
  readonly activeIndex = signal(-1);

  readonly selected = computed(() => this.options().find((option) => option.value === this.value()));

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.position();
    this.activeIndex.set(this.options().findIndex((option) => option.value === this.value()));
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    this.activeIndex.set(-1);
  }

  choose(option: PillSelectOption): void {
    this.close();
    if (option.value !== this.value()) {
      this.valueChange.emit(option.value);
    }
  }

  /** Measures the trigger so the fixed panel lands under it. */
  private position(): void {
    const element = this.trigger()?.nativeElement;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const estimatedHeight = this.options().length * 38 + 12;
    // Flip above when there is no room below — the last rows of a long table
    // would otherwise open off-screen.
    const openUpwards = rect.bottom + estimatedHeight > window.innerHeight && rect.top > estimatedHeight;
    this.panelTop.set(openUpwards ? rect.top - estimatedHeight - 6 : rect.bottom + 6);
    this.panelLeft.set(rect.left);
    this.panelWidth.set(Math.max(rect.width, 180));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  // Scrolling or resizing would leave a fixed panel floating away from its
  // trigger, so it closes rather than chasing the element.
  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.open()) this.close();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const options = this.options();

    if (!this.open()) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        this.toggle();
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.set((this.activeIndex() + 1) % options.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.set((this.activeIndex() - 1 + options.length) % options.length);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const option = options[this.activeIndex()];
        if (option) this.choose(option);
        break;
      }
      default:
        break;
    }
  }
}
