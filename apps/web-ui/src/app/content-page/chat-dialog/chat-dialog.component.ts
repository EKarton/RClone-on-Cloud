import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  Signal,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SafeHtml } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { NgxTypedWriterComponent } from 'ngx-typed-writer';
import { Subscription } from 'rxjs';

import { HasFailedPipe } from '../../shared/results/pipes/has-failed.pipe';
import { HasSucceededPipe } from '../../shared/results/pipes/has-succeeded.pipe';
import { IsPendingPipe } from '../../shared/results/pipes/is-pending.pipe';
import { Result } from '../../shared/results/results';
import { mapResult } from '../../shared/results/utils/mapResult';
import { sendUserMessage, startNewChat } from '../store/chats/chats.actions';
import {
  MessageType,
  Reasoning,
  selectMessages,
} from '../store/chats/chats.state';
import { dialogsActions, dialogsState } from '../store/dialogs';
import { ChatDialogRequest } from './chat-dialog.request';
import { MediaItemsGalleryComponent } from './media-items-gallery/media-items-gallery.component';
import { ReasoningCollapseComponent } from './reasoning-collapse/reasoning-collapse.component';

export interface MessageUiData {
  id: string;
  type: MessageType;
  content: Result<MessageContentUiData>;
}

export interface MessageContentUiData {
  safeHtmlOutput: SafeHtml;
  mediaItemIds: string[];
  reasoning?: Reasoning[];
}

@Component({
  selector: 'app-content-chat-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgxTypedWriterComponent,
    IsPendingPipe,
    HasFailedPipe,
    HasSucceededPipe,
    ReasoningCollapseComponent,
    MediaItemsGalleryComponent,
  ],
  templateUrl: './chat-dialog.component.html',
})
export class ChatDialogComponent implements AfterViewInit, OnDestroy {
  searchControl = new FormControl('');
  @ViewChild('chatDialog') myModal?: ElementRef;

  private readonly store = inject(Store);
  private readonly subscription = new Subscription();

  readonly request$ = this.store.select(
    dialogsState.selectTopDialogRequest(ChatDialogRequest),
  );

  readonly messages: Signal<readonly MessageUiData[]> = computed(() => {
    const rawMessages = this.store.selectSignal(selectMessages())();

    return rawMessages.map((rawMessage) => {
      return {
        id: rawMessage.id,
        type: rawMessage.type,
        content: mapResult(rawMessage.content, (content) => {
          const dirtyMarkdown = marked.parse(content.output) as string;
          const safeHtml = DOMPurify.sanitize(dirtyMarkdown);

          return {
            safeHtmlOutput: safeHtml,
            mediaItemIds: content.mediaItemIds,
            reasoning: content.reasoning,
          };
        }),
      };
    });
  });

  closeDialog() {
    this.store.dispatch(dialogsActions.closeDialog());
  }

  clearChat() {
    this.store.dispatch(startNewChat());
  }

  onSearch() {
    const userInput = this.searchControl.value?.trim();
    if (userInput) {
      this.store.dispatch(sendUserMessage({ userInput }));
      this.searchControl.reset();
    }
  }

  ngAfterViewInit(): void {
    this.subscription.add(
      this.request$.subscribe((request) => {
        if (request) {
          this.myModal?.nativeElement?.showModal();
        } else {
          this.myModal?.nativeElement?.close();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
