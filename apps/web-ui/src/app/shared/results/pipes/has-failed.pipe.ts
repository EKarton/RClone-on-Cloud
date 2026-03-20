import { Pipe, PipeTransform } from '@angular/core';

import { hasFailed, Result } from '../results';

@Pipe({
  name: 'hasFailed',
  standalone: true,
})
export class HasFailedPipe implements PipeTransform {
  transform<T>(value: Result<T>): boolean {
    return hasFailed(value);
  }
}
