import {
  hasFailed,
  isPending,
  Result,
  toFailure,
  toPending,
  toSuccess,
} from '../../results'; // adjust the import path as needed
import { mapResultt } from '../mapResultt'; // adjust the import path as needed

describe('mapResultt', () => {
  const successMapper = (value: number): Result<string> =>
    toSuccess(value.toString());
  const failureMapper = (): Result<string> =>
    toFailure(new Error('Mapper error'));
  const pendingMapper = (): Result<string> => toPending();

  it('should return pending when input is pending', () => {
    const result: Result<number> = toPending();
    const mapped = mapResultt(result, successMapper);
    expect(isPending(mapped)).toBe(true);
  });

  it('should return failure when input has failed', () => {
    const error = new Error('Test error');
    const result: Result<number> = toFailure(error);
    const mapped = mapResultt(result, successMapper);
    expect(hasFailed(mapped)).toBe(true);
    expect(mapped.error).toBe(error);
  });

  it('should apply mapper when input is successful', () => {
    const result: Result<number> = toSuccess(5);
    const mapped = mapResultt(result, successMapper);
    expect(mapped).toEqual(toSuccess('5'));
  });

  it('should handle mapper returning failure', () => {
    const result: Result<number> = toSuccess(5);
    const mapped = mapResultt(result, failureMapper);
    expect(hasFailed(mapped)).toBe(true);
    expect(mapped.error?.message).toBe('Mapper error');
  });

  it('should handle mapper returning pending', () => {
    const result: Result<number> = toSuccess(5);
    const mapped = mapResultt(result, pendingMapper);
    expect(isPending(mapped)).toBe(true);
  });

  it('should work with complex input types', () => {
    const complexMapper = (value: { x: number; y: string }): Result<number> =>
      toSuccess(value.x);
    const result: Result<{ x: number; y: string }> = toSuccess({
      x: 5,
      y: 'test',
    });
    const mapped = mapResultt(result, complexMapper);
    expect(mapped).toEqual(toSuccess(5));
  });

  it('should handle identity mapper', () => {
    const identityMapper = <T>(value: T): Result<T> => toSuccess(value);
    const result: Result<number> = toSuccess(5);
    const mapped = mapResultt(result, identityMapper);
    expect(mapped).toEqual(result);
  });
});
