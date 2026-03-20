import { toSuccess } from '../../../../shared/results/results';
import * as chatActions from '../chats.actions';
import { chatsReducer } from '../chats.reducer';
import { ChatsState, initialState } from '../chats.state';

describe('Chat Reducer', () => {
  it('should handle startNewChat by clearing messages', () => {
    const prevState: ChatsState = {
      ...initialState,
      messages: [
        {
          id: '1',
          type: 'User',
          content: toSuccess({ output: 'hi', mediaItemIds: [] }),
        },
      ],
    };

    const action = chatActions.startNewChat();
    const newState = chatsReducer(prevState, action);

    expect(newState.messages.length).toBe(0);
  });

  it('should handle sendUserMessage by adding a User message', () => {
    const userInput = 'Hello world';
    const action = chatActions.sendUserMessage({ userInput });

    const newState = chatsReducer(initialState, action);

    expect(newState.messages.length).toBe(1);
    expect(newState.messages[0]).toEqual({
      id: jasmine.any(String),
      type: 'User',
      content: toSuccess({
        output: userInput,
        mediaItemIds: [],
      }),
    });
  });

  it('should handle addOrUpdateBotMessage by adding a new Bot message if id not found', () => {
    const botMessage = {
      content: 'Hello from bot',
      mediaItemIds: [],
      reasoning: [],
    };
    const id = 'bot-msg-1';
    const action = chatActions.addOrUpdateBotMessage({
      id,
      botMessage: toSuccess(botMessage),
    });

    const newState = chatsReducer(initialState, action);

    expect(newState.messages.length).toBe(1);
    expect(newState.messages[0]).toEqual({
      id: id,
      type: 'Bot',
      content: toSuccess({
        output: botMessage.content,
        mediaItemIds: [],
        reasoning: [],
      }),
    });
  });

  it('should handle addOrUpdateBotMessage by updating existing Bot message', () => {
    const prevState: ChatsState = {
      ...initialState,
      messages: [
        {
          id: 'user-msg-1',
          type: 'User',
          content: toSuccess({
            output: 'What is water',
            mediaItemIds: [],
            reasoning: [],
          }),
        },
        {
          id: 'bot-msg-1',
          type: 'Bot',
          content: toSuccess({
            output: 'Old content',
            mediaItemIds: [],
            reasoning: [],
          }),
        },
      ],
    };

    const updatedBotMessage = {
      content: 'Updated content',
      mediaItemIds: [],
      reasoning: [{ id: 'r1', content: 'some reasoning' }],
    };
    const action = chatActions.addOrUpdateBotMessage({
      id: 'bot-msg-1',
      botMessage: toSuccess(updatedBotMessage),
    });

    const newState = chatsReducer(prevState, action);

    expect(newState.messages.length).toBe(2);
    expect(newState.messages[0]).toEqual({
      id: 'user-msg-1',
      type: 'User',
      content: toSuccess({
        output: 'What is water',
        mediaItemIds: [],
        reasoning: [],
      }),
    });
    expect(newState.messages[1]).toEqual({
      id: 'bot-msg-1',
      type: 'Bot',
      content: toSuccess({
        output: updatedBotMessage.content,
        mediaItemIds: [],
        reasoning: updatedBotMessage.reasoning,
      }),
    });
  });
});
