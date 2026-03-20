import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../../auth/store';
import { toSuccess } from '../../../../../shared/results/results';
import { OpenClipEmbedderService } from '../../../text-embedding/open-clip-embedder.service';
import { MediaItem } from '../../../web-api/types/media-item';
import { WebApiService } from '../../../web-api/web-api.service';
import {
  SearchMediaItemsByTextTool,
  SearchPhotosByTextToolInputType,
} from '../search-media-items-by-text';

describe('SearchMediaItemsForTextTool', () => {
  let tool: SearchMediaItemsByTextTool;
  let webApiServiceSpy: jasmine.SpyObj<WebApiService>;
  let textEmbedderSpy: jasmine.SpyObj<OpenClipEmbedderService>;
  const fakeToken = 'FAKE_TOKEN';

  beforeEach(() => {
    // Web API service spy
    webApiServiceSpy = jasmine.createSpyObj<WebApiService>('WebApiService', [
      'vectorSearchMediaItems',
    ]);

    // Open Clip Embedder service spy
    textEmbedderSpy = jasmine.createSpyObj<OpenClipEmbedderService>(
      'OpenClipEmbedderService',
      ['getTextEmbedding'],
    );

    TestBed.configureTestingModule({
      providers: [
        SearchMediaItemsByTextTool,
        provideMockStore({
          selectors: [
            { selector: authState.selectAuthToken, value: fakeToken },
          ],
        }),
        { provide: WebApiService, useValue: webApiServiceSpy },
        { provide: OpenClipEmbedderService, useValue: textEmbedderSpy },
      ],
    });

    tool = TestBed.inject(SearchMediaItemsByTextTool);

    const mockMediaItems: MediaItem[] = [
      {
        id: '123',
        fileName: 'photo.jpg',
        location: { latitude: 10.5, longitude: 20.5 },
        gPhotosMediaItemId: 'gphoto123',
        width: 800,
        height: 600,
        dateTaken: new Date('2023-01-01T10:00:00Z'),
        hashCode: '123',
        mimeType: 'image/jpeg',
      },
    ];

    webApiServiceSpy.vectorSearchMediaItems.and.returnValue(
      of(toSuccess({ mediaItems: mockMediaItems })),
    );
    textEmbedderSpy.getTextEmbedding.and.returnValue(
      of(new Float32Array([1, 2, 3])),
    );
  });

  it('should call webApiService with correct parameters and map results', async () => {
    const input: SearchPhotosByTextToolInputType = {
      query: 'sunset beach',
      earliest_date_taken: '2022-01-01',
      latest_date_taken: '2022-12-31',
      within_media_item_ids: '123,456',
      top_k: 25,
    };

    const result = await tool.func(input);

    expect(webApiServiceSpy.vectorSearchMediaItems).toHaveBeenCalledWith(
      fakeToken,
      {
        queryEmbedding: new Float32Array([1, 2, 3]),
        earliestDateTaken: new Date('2022-01-01'),
        latestDateTaken: new Date('2022-12-31'),
        withinMediaItemIds: ['123', '456'],
        topK: 25,
      },
    );
    expect(result.media_items[0]).toEqual({
      id: '123',
      file_name: 'photo.jpg',
      location: { latitude: 10.5, longitude: 20.5 },
      width: 800,
      height: 600,
      date_taken: '2023-01-01T10:00:00.000Z',
      mime_type: 'image/jpeg',
    });
  });

  it('should call webApiService with correct parameters and map results given no optional params', async () => {
    const input: SearchPhotosByTextToolInputType = {
      query: 'sunset beach',
      earliest_date_taken: '',
      latest_date_taken: '',
      within_media_item_ids: '',
      top_k: 5,
    };

    const result = await tool.func(input);

    expect(webApiServiceSpy.vectorSearchMediaItems).toHaveBeenCalledWith(
      fakeToken,
      {
        queryEmbedding: new Float32Array([1, 2, 3]),
        earliestDateTaken: undefined,
        latestDateTaken: undefined,
        withinMediaItemIds: undefined,
        topK: 5,
      },
    );
    expect(result.media_items[0]).toEqual({
      id: '123',
      file_name: 'photo.jpg',
      location: { latitude: 10.5, longitude: 20.5 },
      width: 800,
      height: 600,
      date_taken: '2023-01-01T10:00:00.000Z',
      mime_type: 'image/jpeg',
    });
  });

  it('should throw an error given text embedding returned null', async () => {
    textEmbedderSpy.getTextEmbedding.and.returnValue(of(null));

    const input: SearchPhotosByTextToolInputType = {
      query: 'sunset beach',
      earliest_date_taken: '',
      latest_date_taken: '',
      within_media_item_ids: '',
      top_k: 5,
    };

    await expectAsync(tool.func(input)).toBeRejected();
  });
});
