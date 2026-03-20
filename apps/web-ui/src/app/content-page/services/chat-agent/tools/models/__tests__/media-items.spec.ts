import { MediaItem } from '../../../../web-api/types/media-item';
import {
  domainToGpsLocation,
  domainToToolMediaItem,
  GpsLocationModelSchema,
  MediaItemModel,
  MediaItemModelSchema,
} from '../media-items';

describe('MediaItem model conversions', () => {
  describe('domainToGpsLocation', () => {
    it('should convert a valid location object', () => {
      const loc = { latitude: 12.34, longitude: 56.78 };
      const result = domainToGpsLocation(loc);
      expect(result).toEqual({ latitude: 12.34, longitude: 56.78 });

      // Also validate against Zod schema
      expect(() => GpsLocationModelSchema.parse(result)).not.toThrow();
    });

    it('should return undefined if location is undefined', () => {
      const result = domainToGpsLocation(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('domainToToolMediaItem', () => {
    it('should convert a MediaItem with location correctly', () => {
      const mediaItem: MediaItem = {
        id: '1',
        fileName: 'photo.jpg',
        gPhotosMediaItemId: 'g1',
        width: 1920,
        height: 1080,
        location: { latitude: 12.34, longitude: 56.78 },
        dateTaken: new Date('2024-01-01T00:00:00.000Z'),
        hashCode: 'abc', // extra fields should be ignored
        mimeType: 'image/jpeg',
      };

      const result = domainToToolMediaItem(mediaItem);

      expect(result).toEqual({
        id: '1',
        file_name: 'photo.jpg',
        width: 1920,
        height: 1080,
        location: { latitude: 12.34, longitude: 56.78 },
        date_taken: '2024-01-01T00:00:00.000Z',
        mime_type: 'image/jpeg',
      });

      expect(() => MediaItemModelSchema.parse(result)).not.toThrow();
    });

    it('should handle MediaItem with undefined location', () => {
      const mediaItem: MediaItem = {
        id: '2',
        fileName: 'photo2.jpg',
        gPhotosMediaItemId: 'g2',
        width: 800,
        height: 600,
        location: undefined,
        dateTaken: new Date('2024-02-01T12:34:56Z'),
        hashCode: 'def',
        mimeType: 'image/jpeg',
      };

      const result = domainToToolMediaItem(mediaItem);

      expect(result.location).toBeUndefined();
      expect(result.date_taken).toBe('2024-02-01T12:34:56.000Z');
      expect(() => MediaItemModelSchema.parse(result)).not.toThrow();
    });

    it('should convert date_taken if it is a string', () => {
      const mediaItem: MediaItem = {
        id: '3',
        fileName: 'photo3.jpg',
        gPhotosMediaItemId: 'g3',
        width: 640,
        height: 480,
        location: undefined,
        dateTaken: '2024-03-01T08:00:00Z' as unknown as Date,
        hashCode: 'ghi',
        mimeType: 'image/jpeg',
      };

      const result = domainToToolMediaItem(mediaItem);
      expect(result.date_taken).toBe('2024-03-01T08:00:00.000Z');
      expect(() => MediaItemModelSchema.parse(result)).not.toThrow();
    });
  });

  describe('Zod schemas', () => {
    it('should validate a correct GPS location', () => {
      const validLocation = { latitude: 10, longitude: 20 };
      expect(() => GpsLocationModelSchema.parse(validLocation)).not.toThrow();
    });

    it('should throw on invalid GPS location', () => {
      const invalidLocation = { latitude: '10', longitude: 20 };
      expect(() => GpsLocationModelSchema.parse(invalidLocation)).toThrow();
    });

    it('should validate a correct MediaItemModel', () => {
      const validItem: MediaItemModel = {
        id: '1',
        file_name: 'photo.jpg',
        width: 100,
        height: 200,
        location: { latitude: 1, longitude: 2 },
        date_taken: new Date().toISOString(),
        mime_type: 'image/jpeg',
      };
      expect(() => MediaItemModelSchema.parse(validItem)).not.toThrow();
    });

    it('should throw on MediaItemModel missing required fields', () => {
      const invalidItem = {
        id: '1',
        file_name: 'photo.jpg',
      };
      expect(() => MediaItemModelSchema.parse(invalidItem)).toThrow();
    });
  });
});
