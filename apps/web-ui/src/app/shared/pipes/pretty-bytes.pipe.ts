import { Pipe, PipeTransform } from '@angular/core';
import prettyBytes from 'pretty-bytes';

@Pipe({
  name: 'prettyBytes',
  standalone: true,
})
export class PrettyBytesPipe implements PipeTransform {
  transform(value: number): string {
    return prettyBytes(value);
  }
}
