import { TestBed } from '@angular/core/testing';
import { AIMessageChunk } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MemorySaver } from '@langchain/langgraph/web';
import { provideMockStore } from '@ngrx/store/testing';

import { environment } from '../../../../../environments/environment';
import { authState } from '../../../../auth/store';
import { CHAT_MODEL, MEMORY_SAVER } from '../../../content-page.tokens';
import { WebApiService } from '../../web-api/web-api.service';
import { BotMessage, ChatAgentService } from '../chat-agent.service';

class MockRunnable {
  invoke = jasmine.createSpy('invoke');
}

describe('ChatAgentService', () => {
  let service: ChatAgentService;
  let mockMemorySaver: MemorySaver;
  let mockLLM: ChatGoogleGenerativeAI;

  beforeEach(async () => {
    mockMemorySaver = new MemorySaver();
    spyOn(mockMemorySaver, 'deleteThread').and.callThrough();

    mockLLM = new ChatGoogleGenerativeAI({
      model: environment.geminiModel,
      temperature: 0.7,
      apiKey: environment.geminiApiKey,
    });
    spyOn(mockLLM, 'invoke').and.resolveTo(
      new AIMessageChunk({ content: 'content' }),
    );

    const webApiServiceSpy = jasmine.createSpyObj<WebApiService>(
      'WebApiService',
      ['vectorSearchMediaItems'],
    );

    TestBed.configureTestingModule({
      providers: [
        ChatAgentService,
        { provide: MEMORY_SAVER, useValue: mockMemorySaver },
        { provide: CHAT_MODEL, useValue: mockLLM },
        provideMockStore({
          selectors: [
            { selector: authState.selectAuthToken, value: 'accessToken123' },
          ],
        }),
        { provide: WebApiService, useValue: webApiServiceSpy },
      ],
    });

    service = TestBed.inject(ChatAgentService);

    // Wait for async loadAgent() to complete
    await service.loadAgent();
  });

  it('clearMemory should call deleteThread with default thread id', () => {
    service.clearMemory();

    expect(mockMemorySaver.deleteThread).toHaveBeenCalledWith('default_thread');
  });

  it('getAgentResponse should error if agent is not initialized', (done) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).agent = undefined;

    service.getAgentResponse('hi').subscribe({
      next: () => fail('should not emit'),
      error: (err) => {
        expect(err.message).toBe('Agent executor not initialized yet');
        done();
      },
    });
  });

  it('getAgentResponse should emit output and media item IDs and complete', (done) => {
    const mockRunnable = new MockRunnable();
    mockRunnable.invoke.and.resolveTo({
      structuredResponse: {
        output: 'Hi',
        mediaItemIds: ['client1:photo1', 'client2:photo2'],
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).agent = mockRunnable;

    const emitted: BotMessage[] = [];
    service.getAgentResponse('hello').subscribe({
      next: (msg) => emitted.push(msg),
      complete: () => {
        expect(emitted.length).toBeGreaterThan(0);
        expect(emitted[0].content).toContain('Hi');
        expect(emitted[0].mediaItemIds).toEqual([
          'client1:photo1',
          'client2:photo2',
        ]);
        expect(emitted[0].reasoning).toBeUndefined();
        done();
      },
      error: (err) => fail(err),
    });
  });

  it('getAgentResponse should emit error when fake stream throws an error', (done) => {
    const mockRunnable = new MockRunnable();
    mockRunnable.invoke.and.returnValue(
      Promise.reject(new Error('Random error')),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).agent = mockRunnable;

    service.getAgentResponse('hello').subscribe({
      error: () => {
        done();
      },
    });
  });
});
