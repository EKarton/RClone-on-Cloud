import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../../auth/store';
import { toSuccess } from '../../../../../shared/results/results';
import { MediaItem } from '../../../web-api/types/media-item';
import { WebApiService } from '../../../web-api/web-api.service';
import { FindMediaItemsTool, FindPhotosToolInput } from '../find-media-items';

describe('FindPhotosTool', () => {
  let tool: FindMediaItemsTool;
  let webApiServiceSpy: jasmine.SpyObj<WebApiService>;
  const fakeToken = 'FAKE_TOKEN';

  beforeEach(() => {
    webApiServiceSpy = jasmine.createSpyObj<WebApiService>('WebApiService', [
      'sampleMediaItems',
    ]);

    TestBed.configureTestingModule({
      providers: [
        FindMediaItemsTool,
        provideMockStore({
          selectors: [
            { selector: authState.selectAuthToken, value: fakeToken },
          ],
        }),
        { provide: WebApiService, useValue: webApiServiceSpy },
      ],
    });

    tool = TestBed.inject(FindMediaItemsTool);
  });

  it('should call webApiService with correct params and map results', async () => {
    const mockMediaItems: MediaItem[] = [
      {
        id: '1',
        fileName: 'test.jpg',
        location: { latitude: 10, longitude: 20 },
        gPhotosMediaItemId: 'g1',
        width: 1920,
        height: 1080,
        dateTaken: new Date('2023-01-01T00:00:00Z'),
        hashCode: '1',
        mimeType: 'image/jpeg',
      },
    ];

    webApiServiceSpy.sampleMediaItems.and.returnValue(
      of(toSuccess({ mediaItems: mockMediaItems })),
    );

    const input: FindPhotosToolInput = {
      earliest_date_taken: '2023-01-01',
      latest_date_taken: '2023-01-31',
      within_geo_location: '50,60',
      within_geo_range: 1000,
      limit: 50,
    };

    const result = await tool.func(input);

    expect(webApiServiceSpy.sampleMediaItems).toHaveBeenCalledWith(fakeToken, {
      earliestDateTaken: new Date('2023-01-01'),
      latestDateTaken: new Date('2023-01-31'),
      locationRange: {
        latitude: 50,
        longitude: 60,
        range: 1000,
      },
      pageSize: 50,
    });

    expect(result.media_items.length).toBe(1);
    expect(result.media_items[0]).toEqual({
      id: '1',
      file_name: 'test.jpg',
      location: { latitude: 10, longitude: 20 },
      width: 1920,
      height: 1080,
      date_taken: '2023-01-01T00:00:00.000Z',
      mime_type: 'image/jpeg',
    });
  });

  it('should handle empty optional fields', async () => {
    webApiServiceSpy.sampleMediaItems.and.returnValue(
      of(toSuccess({ mediaItems: [] })),
    );

    const input: FindPhotosToolInput = {
      earliest_date_taken: '',
      latest_date_taken: '',
      within_geo_location: '',
      within_geo_range: 0,
      limit: 50,
    };

    const result = await tool.func(input);

    expect(webApiServiceSpy.sampleMediaItems).toHaveBeenCalledWith(fakeToken, {
      earliestDateTaken: undefined,
      latestDateTaken: undefined,
      locationRange: undefined,
      pageSize: 50,
    });
    expect(result.media_items).toEqual([]);
  });

  it('should ignore locationRange if radius is 0', async () => {
    webApiServiceSpy.sampleMediaItems.and.returnValue(
      of(toSuccess({ mediaItems: [] })),
    );

    const input: FindPhotosToolInput = {
      earliest_date_taken: '',
      latest_date_taken: '',
      within_geo_location: '10,20',
      within_geo_range: 0,
      limit: 50,
    };

    await tool.func(input);

    expect(webApiServiceSpy.sampleMediaItems).toHaveBeenCalledWith(fakeToken, {
      earliestDateTaken: undefined,
      latestDateTaken: undefined,
      locationRange: undefined,
      pageSize: 50,
    });
  });
});
