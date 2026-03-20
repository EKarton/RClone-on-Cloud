import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  input,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';

import {
  ListMediaItemsSortBy,
  ListMediaItemsSortByFields,
  ListMediaItemsSortDirection,
} from '../services/web-api/types/list-media-items';
import { ImagesListComponent } from './images-list/images-list.component';
import { ImagesMapComponent } from './images-map/images-map.component';
import { ImagesSortDropdownComponent } from './images-sort-dropdown/images-sort-dropdown.component';
import {
  ImagesViewDropdownComponent,
  ImagesViewOptions,
} from './images-view-dropdown/images-view-dropdown.component';

@Component({
  standalone: true,
  selector: 'app-content-images-view',
  imports: [
    CommonModule,
    ImagesListComponent,
    ImagesMapComponent,
    ImagesSortDropdownComponent,
    ImagesViewDropdownComponent,
  ],
  templateUrl: './images-view.component.html',
})
export class ImagesViewComponent {
  readonly albumId = input<string>();
  readonly ImagesViewOptions = ImagesViewOptions;

  @ViewChild('mapView', { read: ElementRef }) mapView?: ElementRef;

  readonly imagesSortBy: WritableSignal<ListMediaItemsSortBy> = signal({
    field: ListMediaItemsSortByFields.DATE_TAKEN,
    direction: ListMediaItemsSortDirection.ASCENDING,
  });

  readonly imagesViewOption: WritableSignal<ImagesViewOptions> = signal(
    ImagesViewOptions.LIST,
  );

  constructor() {
    // Scroll to the map when the option is selected to map
    effect(() => {
      if (this.imagesViewOption() === ImagesViewOptions.MAP) {
        setTimeout(() => {
          this.mapView?.nativeElement.scrollIntoView({ behavior: 'smooth' });
        }, 0);
      }
    });
  }
}
