import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FileViewerComponent } from './file-viewer/file-viewer.component';
import { HeaderComponent } from './header/header.component';

@Component({
  standalone: true,
  selector: 'app-content-page',
  imports: [CommonModule, HeaderComponent, FileViewerComponent, RouterOutlet],
  templateUrl: './content-page.component.html',
})
export class ContentPageComponent {}
