import { isPending } from './src/app/shared/results/results';

describe('Reproduction', () => {
  it('should fail with TypeError when result is undefined', () => {
    try {
      isPending(undefined as any);
    } catch (e: any) {
      console.log('Caught expected error:', e.message);
      expect(e.message).toContain("reading 'isLoading'");
    }
  });
});
