import { Pipe, PipeTransform } from '@angular/core';

import { hasSucceed, Result } from '../results';

@Pipe({
  name: 'hasSucceeded',
  standalone: true,
})
export class HasSucceededPipe implements PipeTransform {
  transform<T>(value: Result<T>): unknown {
    return hasSucceed(value);
  }
}
