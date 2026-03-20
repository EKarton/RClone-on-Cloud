import { toSuccess } from '../../../../shared/results/results';
import {
  ChatsState,
  FEATURE_KEY,
  initialState,
  Message,
  MessageContent,
  selectChatsState,
  selectMessages,
} from '../chats.state';

describe('Chat State', () => {
  it('should have the correct initial state', () => {
    expect(initialState).toEqual({
      messages: [],
    });
  });

  describe('selectChatsState', () => {
    it('should select the chats state slice from root state', () => {
      const rootState = {
        [FEATURE_KEY]: initialState,
      };

      const selected = selectChatsState(rootState);

      expect(selected).toBe(initialState);
    });
  });

  describe('selectMessages', () => {
    it('should select messages array from chats state', () => {
      const messages: Message[] = [
        {
          id: '1',
          type: 'User',
          content: toSuccess<MessageContent>({
            output: 'Hello',
            mediaItemIds: [],
          }),
        },
        {
          id: '2',
          type: 'Bot',
          content: toSuccess<MessageContent>({
            output: 'Hi there',
            mediaItemIds: [],
            reasoning: [{ id: 'r1', content: 'some reasoning' }],
          }),
        },
      ];

      const state: ChatsState = { messages };

      const rootState = {
        [FEATURE_KEY]: state,
      };

      const selectedMessages = selectMessages()(rootState);

      expect(selectedMessages).toEqual(messages);
    });

    it('should return an empty array if no messages', () => {
      const rootState = {
        [FEATURE_KEY]: { messages: [] },
      };

      const selectedMessages = selectMessages()(rootState);

      expect(selectedMessages).toEqual([]);
    });
  });
});
