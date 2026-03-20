import { hasFailed, isPending, Result } from '../results';

export function takeSuccessfulDataOrElse<T>(
  result: Result<T>,
  defaultValue: T,
): T {
  if (isPending(result)) {
    return defaultValue;
  }

  if (hasFailed(result)) {
    return defaultValue;
  }

  return result.data!;
}
