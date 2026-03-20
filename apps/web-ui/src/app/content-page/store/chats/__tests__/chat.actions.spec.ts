import { toSuccess } from '../../../../shared/results/results';
import { BotMessage } from '../../../services/chat-agent/chat-agent.service';
import {
  addOrUpdateBotMessage,
  sendUserMessage,
  startNewChat,
} from '../chats.actions';

describe('Chat Actions', () => {
  it('should create startNewChat action', () => {
    const action = startNewChat();

    expect(action.type).toBe(
      '[Chats] Clears the old chat and requests for a new chat',
    );
  });

  it('should create sendUserMessage action with user input', () => {
    const userInput = 'Hello world';
    const action = sendUserMessage({ userInput });

    expect(action.type).toBe('[Chats] Send a user message');
    expect(action.userInput).toBe(userInput);
  });

  it('should create addOrUpdateBotMessage action with id and botMessage result', () => {
    const id = 'bot-message-1';
    const botMessage: BotMessage = {
      content: 'Hi there!',
      mediaItemIds: [],
      reasoning: [{ id: 'r1', content: 'Reason 1' }],
    };
    const result = toSuccess(botMessage);

    const action = addOrUpdateBotMessage({ id, botMessage: result });

    expect(action.type).toBe('[Chats] Adds or updates a bot message');
    expect(action.id).toBe(id);
    expect(action.botMessage).toEqual(result);
  });
});
