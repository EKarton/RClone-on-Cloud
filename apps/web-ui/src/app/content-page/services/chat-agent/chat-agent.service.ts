import { inject, Injectable } from '@angular/core';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { Runnable } from '@langchain/core/runnables';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { Observable, throwError } from 'rxjs';
import { z } from 'zod';

import { CHAT_MODEL, MEMORY_SAVER } from '../../content-page.tokens';
import { FindMediaItemsTool } from './tools/find-media-items';
import { CurrentTimeTool } from './tools/get-current-time';
import { SearchMediaItemsByTextTool } from './tools/search-media-items-by-text';

/** The response from the LLM */
export interface BotMessage {
  content: string;
  mediaItemIds: string[];
  reasoning?: BotMessageReasoning[];
}

/** The reasoning message of the Bot message */
export interface BotMessageReasoning {
  id: string;
  content: string;
}

/** The default thread ID */
const DEFAULT_THREAD_ID = 'default_thread';

export const ResponseFormatSchema = z.object({
  output: z
    .string()
    .describe(
      "The human-readable answer to the user's question. If there are media items to show to the user, only include the count of the media items to display in the output field",
    ),
  mediaItemIds: z
    .array(z.string())
    .describe(
      'A list of media item IDs for each media item to show to the user',
    ),
});

export type ResponseFormatType = z.infer<typeof ResponseFormatSchema>;

/** The chat agent used to interface with the UI */
@Injectable({ providedIn: 'root' })
export class ChatAgentService {
  private agent?: Runnable;

  private readonly memorySaver = inject(MEMORY_SAVER);
  private readonly chatGoogleGenerativeAI = inject(CHAT_MODEL);
  private readonly getCurrentTimeTool = inject(CurrentTimeTool);
  private readonly searchMediaItemsForTextTool = inject(
    SearchMediaItemsByTextTool,
  );
  private readonly findMediaItemsTool = inject(FindMediaItemsTool);

  constructor() {
    this.loadAgent();
  }

  async loadAgent() {
    const parser = StructuredOutputParser.fromZodSchema(ResponseFormatSchema);

    const tools = [this.getCurrentTimeTool, this.findMediaItemsTool];
    if (this.searchMediaItemsForTextTool.isEnabled()) {
      tools.push(this.searchMediaItemsForTextTool);
    }

    this.agent = await createReactAgent({
      llm: this.chatGoogleGenerativeAI,
      tools,
      checkpointSaver: this.memorySaver,
      responseFormat: parser,
    });
  }

  clearMemory() {
    this.memorySaver.deleteThread(DEFAULT_THREAD_ID);
  }

  getAgentResponse(userMessage: string): Observable<BotMessage> {
    if (!this.agent) {
      return throwError(() => new Error('Agent executor not initialized yet'));
    }

    return new Observable<BotMessage>((observer) => {
      (async () => {
        try {
          const response = await this.agent!.invoke(
            {
              messages: [
                {
                  role: 'user',
                  content: userMessage,
                },
              ],
            },
            {
              configurable: {
                thread_id: DEFAULT_THREAD_ID,
              },
            },
          );

          observer.next({
            content: response.structuredResponse.output,
            mediaItemIds: response.structuredResponse.mediaItemIds,
          });
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }
}
