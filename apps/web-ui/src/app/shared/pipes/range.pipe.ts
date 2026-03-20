import { Pipe, PipeTransform } from '@angular/core';

/** Returns a list of numbers [1, ..., N] given N */
@Pipe({ name: 'range' })
export class RangePipe implements PipeTransform {
  transform(value: number): number[] {
    return Array.from({ length: value }, (_, i) => i + 1);
  }
}
