import { zip } from '../zip';

describe('zip', () => {
  it('should zip two lists of equal length', () => {
    const list1 = [1, 2, 3];
    const list2 = ['a', 'b', 'c'];

    const result = zip(list1, list2);

    expect(result).toEqual([
      [1, 'a'],
      [2, 'b'],
      [3, 'c'],
    ]);
  });

  it('should return an empty array if lists are of different lengths', () => {
    const list1 = [1, 2];
    const list2 = ['a', 'b', 'c'];

    const result = zip(list1, list2);

    expect(result).toEqual([]);
  });

  it('should return an empty array if both lists are empty', () => {
    const list1: number[] = [];
    const list2: string[] = [];

    const result = zip(list1, list2);

    expect(result).toEqual([]);
  });

  it('should zip lists with one element each', () => {
    const list1 = [42];
    const list2 = ['x'];

    const result = zip(list1, list2);

    expect(result).toEqual([[42, 'x']]);
  });

  it('should return an empty array if the first list is empty', () => {
    const list1: number[] = [];
    const list2 = ['a', 'b'];

    const result = zip(list1, list2);

    expect(result).toEqual([]);
  });

  it('should return an empty array if the second list is empty', () => {
    const list1 = [1, 2];
    const list2: string[] = [];

    const result = zip(list1, list2);

    expect(result).toEqual([]);
  });
});
