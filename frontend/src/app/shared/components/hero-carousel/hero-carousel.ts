import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';
import { CarouselBanner } from '../../../core/models';
import { CdnImagePipe } from '../../pipes/cdn-image.pipe';

const AUTO_ROTATE_MS = 5000;

@Component({
  selector: 'app-hero-carousel',
  standalone: true,
  imports: [LucideAngularModule, CdnImagePipe],
  templateUrl: './hero-carousel.html',
})
export class HeroCarousel {
  readonly banners = input.required<CarouselBanner[]>();

  private readonly destroyRef = inject(DestroyRef);
  readonly activeIndex = signal(0);

  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;

  private timerId: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.startAutoRotate();
    this.destroyRef.onDestroy(() => this.stopAutoRotate());
  }

  goTo(index: number): void {
    this.activeIndex.set(index);
    this.restartAutoRotate();
  }

  next(): void {
    const total = this.banners().length;
    this.activeIndex.update((i) => (total === 0 ? 0 : (i + 1) % total));
    this.restartAutoRotate();
  }

  previous(): void {
    const total = this.banners().length;
    this.activeIndex.update((i) => (total === 0 ? 0 : (i - 1 + total) % total));
    this.restartAutoRotate();
  }

  private startAutoRotate(): void {
    this.timerId = setInterval(() => {
      const total = this.banners().length;
      if (total > 0) {
        this.activeIndex.update((i) => (i + 1) % total);
      }
    }, AUTO_ROTATE_MS);
  }

  private stopAutoRotate(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  private restartAutoRotate(): void {
    this.stopAutoRotate();
    this.startAutoRotate();
  }
}
