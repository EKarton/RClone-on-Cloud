import { selectTopDialogRequest, DialogState, initialState } from '../dialogs.state';

class MockRequestA {
  constructor(public id: string) {}
}

class MockRequestB {
  constructor(public value: number) {}
}

describe('Dialog Selectors', () => {
  describe('selectTopDialogRequest', () => {
    it('should return null if there are no dialog requests', () => {
      const state: DialogState = { ...initialState };

      const selector = selectTopDialogRequest(MockRequestA);
      const result = selector.projector(state);

      expect(result).toBeNull();
    });

    it('should return the top request if it matches the constructor', () => {
      const request = new MockRequestA('123');
      const state: DialogState = {
        requests: [request],
      };

      const selector = selectTopDialogRequest(MockRequestA);
      const result = selector.projector(state);

      expect(result).toBe(request);
    });

    it('should return null if the top request does not match the constructor', () => {
      const request = new MockRequestB(456);
      const state: DialogState = {
        requests: [request],
      };

      const selector = selectTopDialogRequest(MockRequestA);
      const result = selector.projector(state);

      expect(result).toBeNull();
    });

    it('should return the top request when multiple requests exist and top one matches', () => {
      const request1 = new MockRequestA('1');
      const request2 = new MockRequestB(2);
      const request3 = new MockRequestA('3');
      const state: DialogState = {
        requests: [request1, request2, request3],
      };

      const selector = selectTopDialogRequest(MockRequestA);
      const result = selector.projector(state);

      expect(result).toBe(request3);
    });

    it('should return null when multiple requests exist and top one does not match', () => {
      const request1 = new MockRequestA('1');
      const request2 = new MockRequestB(2);
      const state: DialogState = {
        requests: [request1, request2],
      };

      const selector = selectTopDialogRequest(MockRequestA);
      const result = selector.projector(state);

      expect(result).toBeNull();
    });
  });
});
