import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { DynamicStructuredTool } from 'langchain/tools';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

import { selectAuthToken } from '../../../../auth/store/auth.state';
import { fromResult } from '../../../../shared/results/rxjs/fromResult';
import { WebApiService } from '../../web-api/web-api.service';
import {
  domainToToolMediaItem,
  MediaItemModelSchema,
} from './models/media-items';

export const FindPhotosToolInputSchema = z.object({
  earliest_date_taken: z
    .string()
    .default('')
    .describe(
      'Filter to include only photos taken on or after this date in YYYY-MM-DD format. An example is 2025-12-02 for December 2, 2025. Leave empty to apply no lower date limit.',
    ),
  latest_date_taken: z
    .string()
    .default('')
    .describe(
      'Filter to include only photos taken on or before this date in YYYY-MM-DD format. An example is 2025-12-02 for December 2, 2025. Leave empty to apply no upper date limit.',
    ),
  within_geo_location: z
    .string()
    .default('')
    .describe(
      "GPS coordinate as a string in 'latitude,longitude' format. An example is '-87.60515833333332,41.892047222222224'. If provided alongside a positive 'within_geo_range', only photos taken within that radius (in meters) around this location will be included. Leave empty to ignore location filtering.",
    ),
  within_geo_range: z
    .number()
    .default(0)
    .describe(
      "Radius in meters to search around 'within_geo_location'. Must be greater than 0 to enable location-based filtering.",
    ),
  limit: z.number().default(50).describe('Maximum number of photos to return.'),
});

export type FindPhotosToolInput = z.infer<typeof FindPhotosToolInputSchema>;

export const FindPhotosToolOutputSchema = z.object({
  media_items: z.array(MediaItemModelSchema).describe('List of media items'),
});

export type FindPhotosToolOutputType = z.infer<
  typeof FindPhotosToolOutputSchema
>;

@Injectable({ providedIn: 'root' })
export class FindMediaItemsTool extends DynamicStructuredTool {
  private readonly store = inject(Store);
  private readonly webApiService = inject(WebApiService);

  constructor() {
    super({
      name: 'FindPhotos',
      description: `Search your photo library by filtering photos based on date, 
        location, and other metadata. Use this tool to find photos by specifying 
        date ranges or GPS coordinates with radius. Returns matching media items 
        from your library.`,
      schema: FindPhotosToolInputSchema,
      func: async (
        input: FindPhotosToolInput,
      ): Promise<FindPhotosToolOutputType> => {
        const accessToken = await firstValueFrom(
          this.store.select(selectAuthToken),
        );

        const response = await firstValueFrom(
          this.webApiService
            .sampleMediaItems(accessToken, {
              earliestDateTaken: input.earliest_date_taken
                ? new Date(input.earliest_date_taken)
                : undefined,
              latestDateTaken: input.latest_date_taken
                ? new Date(input.latest_date_taken)
                : undefined,
              locationRange:
                input.within_geo_location && input.within_geo_range
                  ? {
                      latitude: parseInt(
                        input.within_geo_location.split(',')[0],
                      ),
                      longitude: parseInt(
                        input.within_geo_location.split(',')[1],
                      ),
                      range: input.within_geo_range,
                    }
                  : undefined,
              pageSize: 50,
            })
            .pipe(fromResult()),
        );

        const mediaItems = response.mediaItems;

        return {
          media_items: mediaItems.map(domainToToolMediaItem),
        };
      },
    });
  }
}
