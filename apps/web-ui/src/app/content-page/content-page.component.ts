import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ChatDialogComponent } from './chat-dialog/chat-dialog.component';
import { HeaderComponent } from './header/header.component';
import { MediaViewerComponent } from './media-viewer/media-viewer.component';

@Component({
  standalone: true,
  selector: 'app-content-page',
  imports: [
    CommonModule,
    HeaderComponent,
    MediaViewerComponent,
    ChatDialogComponent,
    RouterOutlet,
  ],
  templateUrl: './content-page.component.html',
})
export class ContentPageComponent {}
