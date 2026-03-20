import { Result, toFailure, toPending, toSuccess } from '../../results';
import { mapResult } from '../mapResult';

describe('mapResult', () => {
  const mapper = (value: number) => value.toString();

  it('should map the data when result is successful', () => {
    const result: Result<number> = toSuccess(5);
    const mapped = mapResult(result, mapper);

    expect(mapped).toEqual({
      data: '5',
      isLoading: false,
      error: undefined,
    });
  });

  it('should preserve loading state', () => {
    const result: Result<number> = toPending();
    const mapped = mapResult(result, mapper);

    expect(mapped).toEqual({
      data: undefined,
      isLoading: true,
      error: undefined,
    });
  });

  it('should preserve error state', () => {
    const error = new Error('Test error');
    const result: Result<number> = toFailure(error);
    const mapped = mapResult(result, mapper);

    expect(mapped).toEqual(toFailure(error));
  });

  it('should handle undefined data', () => {
    const result: Result<never> = {
      data: undefined,
      isLoading: false,
      error: undefined,
    };
    const mapped = mapResult(result, (value) => value);
    expect(mapped).toEqual(toSuccess(undefined));
  });

  it('should work with complex mapper functions', () => {
    const complexMapper = (value: number) => ({
      original: value,
      doubled: value * 2,
    });
    const result: Result<number> = toSuccess(5);
    const mapped = mapResult(result, complexMapper);

    expect(mapped).toEqual({
      data: { original: 5, doubled: 10 },
      isLoading: false,
      error: undefined,
    });
  });

  it('should handle identity mapper', () => {
    const identityMapper = <T>(value: T) => value;
    const result: Result<number> = toSuccess(5);

    const mapped = mapResult(result, identityMapper);

    expect(mapped).toEqual(result);
  });
});
