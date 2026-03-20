import { createFeatureSelector, createSelector } from '@ngrx/store';

import { Result } from '../../../shared/results/results';

export type MessageType = 'Bot' | 'User';

export interface Message {
  id: string;
  type: MessageType;
  content: Result<MessageContent>;
}

export interface MessageContent {
  output: string;
  mediaItemIds: string[];
  reasoning?: Reasoning[];
}

export interface Reasoning {
  id: string;
  content: string;
}

export interface ChatsState {
  messages: Message[];
}

export const initialState: ChatsState = {
  messages: [],
};

export const FEATURE_KEY = 'Chats';

export const selectChatsState = createFeatureSelector<ChatsState>(FEATURE_KEY);

export const selectMessages = () =>
  createSelector(selectChatsState, (state) => state.messages);
