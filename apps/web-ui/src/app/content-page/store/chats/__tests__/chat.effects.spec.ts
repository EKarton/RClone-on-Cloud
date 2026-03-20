import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { toPending, toSuccess } from '../../../../shared/results/results';
import {
  BotMessage,
  ChatAgentService,
} from '../../../services/chat-agent/chat-agent.service';
import * as chatActions from '../chats.actions';
import { ChatsEffects } from '../chats.effects';

describe('ChatsEffects', () => {
  let actions$: Actions;
  let effects: ChatsEffects;
  let chatAgentServiceSpy: jasmine.SpyObj<ChatAgentService>;

  beforeEach(() => {
    chatAgentServiceSpy = jasmine.createSpyObj('ChatAgentService', [
      'clearMemory',
      'getAgentResponse',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ChatsEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: ChatAgentService, useValue: chatAgentServiceSpy },
      ],
    });

    effects = TestBed.inject(ChatsEffects);
  });

  describe('startNewChat$', () => {
    it('should call clearMemory and not dispatch any action', (done) => {
      actions$ = of(chatActions.startNewChat);

      effects.startNewChat$.subscribe(() => {
        expect(chatAgentServiceSpy.clearMemory).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('sendMessage$', () => {
    it('should call getAgentResponse and dispatch addOrUpdateBotMessage actions', () => {
      const botMessage: BotMessage = { content: 'Hi there', mediaItemIds: [] };
      chatAgentServiceSpy.getAgentResponse.and.returnValue(of(botMessage));

      actions$ = of(chatActions.sendUserMessage({ userInput: 'Hi' }));

      const actions: Action[] = [];
      effects.sendMessage$.subscribe((action) => {
        actions.push(action);
      });

      expect(chatAgentServiceSpy.getAgentResponse).toHaveBeenCalledWith('Hi');
      expect(actions[0]).toEqual(
        jasmine.objectContaining({
          id: jasmine.any(String),
          botMessage: toPending(),
          type: '[Chats] Adds or updates a bot message',
        }),
      );
      expect(actions[1]).toEqual(
        jasmine.objectContaining({
          id: jasmine.any(String),
          botMessage: toSuccess({
            content: 'Hi there',
            mediaItemIds: [],
          }),
          type: '[Chats] Adds or updates a bot message',
        }),
      );
    });
  });
});
