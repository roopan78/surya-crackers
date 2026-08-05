import { Component, input, output } from '@angular/core';
import { Category } from '../../../core/models';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { CdnImagePipe } from '../../pipes/cdn-image.pipe';

@Component({
  selector: 'app-featured-categories',
  standalone: true,
  imports: [ScrollRevealDirective, CdnImagePipe],
  templateUrl: './featured-categories.html',
})
export class FeaturedCategories {
  readonly categories = input.required<Category[]>();
  readonly selected = output<Category>();
}
