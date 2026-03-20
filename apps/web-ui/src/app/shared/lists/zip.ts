/**
 * Zips two lists together. If they are different lengths, it returns []
 * @param list1 First list
 * @param list2 Second list
 * @returns the combined list
 */
export function zip<T, U>(list1: T[], list2: U[]): [T, U][] {
  if (list1.length !== list2.length) {
    return [];
  }

  return list1.map((item, index) => [item, list2[index]]);
}
