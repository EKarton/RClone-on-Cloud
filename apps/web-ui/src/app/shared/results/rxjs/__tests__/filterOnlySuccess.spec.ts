import { of } from 'rxjs';

import { Result, toFailure, toPending, toSuccess } from '../../results';
import { filterOnlySuccess } from '../filterOnlySuccess';

describe('filterOnlySuccess', () => {
  it('should emit only successful results', (done) => {
    const source$ = of(
      toSuccess(1),
      toPending<number>(),
      toFailure<number>(new Error('Error')),
      toSuccess(2),
    );

    const result: number[] = [];
    source$.pipe(filterOnlySuccess()).subscribe(
      (value) => result.push(value),
      null,
      () => {
        expect(result).toEqual([1, 2]);
        done();
      },
    );
  });

  it('should emit nothing if there are no successful results', (done) => {
    const source$ = of(
      toPending<number>(),
      toFailure<number>(new Error('Error')),
    );

    const result: number[] = [];
    source$.pipe(filterOnlySuccess()).subscribe(
      (value) => result.push(value),
      null,
      () => {
        expect(result).toEqual([]);
        done();
      },
    );
  });

  it('should handle an empty observable', (done) => {
    const source$ = of<Result<number>>();

    const result: number[] = [];
    source$.pipe(filterOnlySuccess()).subscribe(
      (value) => result.push(value),
      null,
      () => {
        expect(result).toEqual([]);
        done();
      },
    );
  });

  it('should work with complex data types', (done) => {
    interface ComplexData {
      id: number;
      name: string;
    }
    const complexData: ComplexData = { id: 1, name: 'Test' };
    const source$ = of(
      toSuccess(complexData),
      toFailure<ComplexData>(new Error('Error')),
    );

    const result: (typeof complexData)[] = [];
    source$.pipe(filterOnlySuccess()).subscribe(
      (value) => result.push(value),
      null,
      () => {
        expect(result).toEqual([complexData]);
        done();
      },
    );
  });
});
