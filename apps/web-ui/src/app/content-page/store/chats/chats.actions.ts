import { createAction, props } from '@ngrx/store';

import { Result } from '../../../shared/results/results';
import { BotMessage } from '../../services/chat-agent/chat-agent.service';

/** An action that requests for the chat to be restarted. */
export const startNewChat = createAction(
  '[Chats] Clears the old chat and requests for a new chat',
);

/** An action that adds a user message to the chats. */
export const sendUserMessage = createAction(
  '[Chats] Send a user message',
  props<{ userInput: string }>(),
);

/** An action that adds a bot message to the list of chats. */
export const addOrUpdateBotMessage = createAction(
  '[Chats] Adds or updates a bot message',
  props<{ id: string; botMessage: Result<BotMessage> }>(),
);
