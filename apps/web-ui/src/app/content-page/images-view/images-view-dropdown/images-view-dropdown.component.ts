import { CommonModule } from '@angular/common';
import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

export enum ImagesViewOptions {
  LIST = 'list',
  MAP = 'map',
}

@Component({
  standalone: true,
  selector: 'app-content-images-view-dropdown',
  imports: [CommonModule, FormsModule],
  templateUrl: './images-view-dropdown.component.html',
})
export class ImagesViewDropdownComponent {
  readonly imagesViewOption = model.required<ImagesViewOptions>();
  readonly ImagesViewOptions = ImagesViewOptions;

  setImagesViewOption(newOption: ImagesViewOptions) {
    this.imagesViewOption.update(() => newOption);
  }
}
