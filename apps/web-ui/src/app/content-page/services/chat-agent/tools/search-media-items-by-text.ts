import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { DynamicStructuredTool } from 'langchain/tools';
import { combineLatest, firstValueFrom, switchMap, throwError } from 'rxjs';
import { z } from 'zod';

import { selectAuthToken } from '../../../../auth/store/auth.state';
import { fromResult } from '../../../../shared/results/rxjs/fromResult';
import { mapResultRxJs } from '../../../../shared/results/rxjs/mapResultRxJs';
import { OpenClipEmbedderService } from '../../text-embedding/open-clip-embedder.service';
import { VectorSearchMediaItemsResponse } from '../../web-api/types/search-media-items-by-text';
import { WebApiService } from '../../web-api/web-api.service';
import {
  domainToToolMediaItem,
  MediaItemModelSchema,
} from './models/media-items';

export const SearchPhotosByTextToolInputSchema = z.object({
  query: z
    .string()
    .describe(
      'A natural language description of what to find in the photo library. This should be a short, vivid phrase — NOT just one or two words. For example: "a group of women laughing together", "a father holding his newborn baby", "two dogs playing in the snow".',
    ),
  earliest_date_taken: z
    .string()
    .default('')
    .describe(
      'Earliest photo date (YYYY-MM-DD). An example is 2025-12-02 for December 2, 2025. Leave empty to apply no lower date limit.',
    ),
  latest_date_taken: z
    .string()
    .default('')
    .describe(
      'Latest photo date (YYYY-MM-DD). An example is 2025-12-02 for December 2, 2025. Leave empty to apply no upper date limit.',
    ),
  within_media_item_ids: z
    .string()
    .default('')
    .describe(
      'Comma-separated list of media item IDs to include in search. Leave empty to apply to all media items.',
    ),
  top_k: z
    .number()
    .default(25)
    .describe('Maximum number of similar photos to retrieve'),
});

export type SearchPhotosByTextToolInputType = z.infer<
  typeof SearchPhotosByTextToolInputSchema
>;

export const SearchPhotosByTextToolOutputSchema = z.object({
  media_items: z.array(MediaItemModelSchema).describe('List of similar photos'),
});

export type SearchPhotosByTextToolOutputType = z.infer<
  typeof SearchPhotosByTextToolOutputSchema
>;

@Injectable({ providedIn: 'root' })
export class SearchMediaItemsByTextTool extends DynamicStructuredTool {
  private readonly store = inject(Store);
  private readonly webApiService = inject(WebApiService);
  private readonly openClipEmbedderService = inject(OpenClipEmbedderService);

  constructor() {
    super({
      name: 'SearchMediaItemsForText',
      description: `Use this tool to search for photos based on a natural language description. 
        This is ideal when the user describes what they want to see in photos — 
        for example, "sunsets on the beach", "photos with dogs", or "Christmas morning".
        The tool embeds the user's text query and retrieves visually similar media items
        from the photo library based on semantic similarity.`,
      schema: SearchPhotosByTextToolInputSchema,
      func: async (
        input: SearchPhotosByTextToolInputType,
      ): Promise<SearchPhotosByTextToolOutputType> => {
        return firstValueFrom(
          combineLatest([
            this.store.select(selectAuthToken),
            this.openClipEmbedderService.getTextEmbedding(input.query),
          ]).pipe(
            switchMap(([accessToken, queryEmbedding]) => {
              if (!queryEmbedding) {
                return throwError(
                  () => new Error('Failed to generate query embeddings'),
                );
              }
              return this.webApiService.vectorSearchMediaItems(accessToken, {
                queryEmbedding,
                earliestDateTaken: input.earliest_date_taken
                  ? new Date(input.earliest_date_taken)
                  : undefined,
                latestDateTaken: input.latest_date_taken
                  ? new Date(input.latest_date_taken)
                  : undefined,
                withinMediaItemIds: input.within_media_item_ids
                  ? input.within_media_item_ids.split(',')
                  : undefined,
                topK: input.top_k,
              });
            }),
            mapResultRxJs((res: VectorSearchMediaItemsResponse) => ({
              media_items: res.mediaItems.map(domainToToolMediaItem),
            })),
            fromResult(),
          ),
        );
      },
    });
  }

  isEnabled(): boolean {
    return this.openClipEmbedderService.isEnabled();
  }
}
