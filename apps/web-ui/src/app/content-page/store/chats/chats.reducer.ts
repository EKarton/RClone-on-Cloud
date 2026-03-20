import { createFeature, createReducer, on } from '@ngrx/store';

import { toSuccess } from '../../../shared/results/results';
import { mapResult } from '../../../shared/results/utils/mapResult';
import {
  addOrUpdateBotMessage,
  sendUserMessage,
  startNewChat,
} from './chats.actions';
import { ChatsState, FEATURE_KEY, initialState, Message } from './chats.state';

export const chatsReducer = createReducer(
  initialState,

  on(startNewChat, (state): ChatsState => {
    return {
      ...state,
      messages: [],
    };
  }),

  on(sendUserMessage, (state, { userInput }): ChatsState => {
    return {
      ...state,
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          type: 'User',
          content: toSuccess({ output: userInput, mediaItemIds: [] }),
        },
      ],
    };
  }),

  on(addOrUpdateBotMessage, (state, { id, botMessage }): ChatsState => {
    const updatedMessage: Message = {
      id,
      type: 'Bot',
      content: mapResult(botMessage, (bm) => ({
        output: bm.content,
        mediaItemIds: bm.mediaItemIds,
        reasoning: bm.reasoning,
      })),
    };

    const existingIndex = state.messages.findIndex((msg) => msg.id === id);

    if (existingIndex !== -1) {
      // Replace the message at the found index
      const updatedMessages = state.messages.map((msg, index) =>
        index === existingIndex ? updatedMessage : msg,
      );

      return {
        ...state,
        messages: updatedMessages,
      };
    }

    return {
      ...state,
      messages: [...state.messages, updatedMessage],
    };
  }),
);

export const chatsFeature = createFeature({
  name: FEATURE_KEY,
  reducer: chatsReducer,
});
