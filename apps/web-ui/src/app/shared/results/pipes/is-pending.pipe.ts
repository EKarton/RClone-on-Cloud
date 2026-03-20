import { Pipe, PipeTransform } from '@angular/core';

import { isPending, Result } from '../results';

@Pipe({
  name: 'isPending',
  standalone: true,
})
export class IsPendingPipe implements PipeTransform {
  transform<T>(value: Result<T>): boolean {
    return isPending(value);
  }
}
