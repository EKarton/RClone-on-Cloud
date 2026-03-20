import { InjectionToken } from '@angular/core';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MemorySaver } from '@langchain/langgraph/web';

import { environment } from '../../environments/environment';

/** Injection token for MemorySaver */
export const MEMORY_SAVER = new InjectionToken<MemorySaver>('MemorySaver', {
  providedIn: 'root',
  factory: () => new MemorySaver(),
});

/** Injection token for chat model */
export const CHAT_MODEL = new InjectionToken<ChatGoogleGenerativeAI>(
  'ChatGoogleGenerativeAI',
  {
    providedIn: 'root',
    factory: () =>
      new ChatGoogleGenerativeAI({
        model: environment.geminiModel,
        temperature: 0.7,
        apiKey: environment.geminiApiKey,
      }),
  },
);
