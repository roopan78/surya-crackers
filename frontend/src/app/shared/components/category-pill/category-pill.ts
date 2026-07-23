import { Component, input, output } from '@angular/core';
import { Category } from '../../../core/models';

@Component({
  selector: 'app-category-pill',
  standalone: true,
  templateUrl: './category-pill.html',
})
export class CategoryPill {
  readonly category = input.required<Category>();
  readonly active = input(false);
  readonly selected = output<Category>();
}
