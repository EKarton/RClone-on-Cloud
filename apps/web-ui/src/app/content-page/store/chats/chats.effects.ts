import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, startWith, switchMap, tap } from 'rxjs/operators';

import { Result, toPending } from '../../../shared/results/results';
import { toResult } from '../../../shared/results/rxjs/toResult';
import {
  BotMessage,
  ChatAgentService,
} from '../../services/chat-agent/chat-agent.service';
import {
  addOrUpdateBotMessage,
  sendUserMessage,
  startNewChat,
} from './chats.actions';

@Injectable()
export class ChatsEffects {
  private readonly actions$ = inject(Actions);
  private readonly chatAgentService = inject(ChatAgentService);

  startNewChat$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(startNewChat),
        tap(() => {
          this.chatAgentService.clearMemory();
        }),
      );
    },
    { dispatch: false },
  );

  sendMessage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(sendUserMessage),
      switchMap(({ userInput }) => {
        const messageId = crypto.randomUUID();
        return this.chatAgentService.getAgentResponse(userInput).pipe(
          toResult(),
          startWith(toPending<BotMessage>()),
          map((botMessage: Result<BotMessage>) =>
            addOrUpdateBotMessage({ id: messageId, botMessage }),
          ),
        );
      }),
    );
  });
}
