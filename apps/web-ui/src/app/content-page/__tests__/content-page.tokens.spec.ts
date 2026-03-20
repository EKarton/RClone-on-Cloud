import { TestBed } from '@angular/core/testing';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MemorySaver } from '@langchain/langgraph/web';

import { CHAT_MODEL, MEMORY_SAVER } from '../content-page.tokens';

describe('Injection tokens', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  describe('MEMORY_SAVER', () => {
    it('should provide a MemorySaver instance', () => {
      const instance = TestBed.inject(MEMORY_SAVER);
      expect(instance).toBeInstanceOf(MemorySaver);
    });

    it('should always return the same singleton instance', () => {
      const first = TestBed.inject(MEMORY_SAVER);
      const second = TestBed.inject(MEMORY_SAVER);
      expect(first).toBe(second);
    });
  });

  describe('CHAT_MODEL', () => {
    it('should provide a ChatGoogleGenerativeAI instance', () => {
      const instance = TestBed.inject(CHAT_MODEL);
      expect(instance).toBeInstanceOf(ChatGoogleGenerativeAI);
    });

    it('should return the same singleton instance from the root injector', () => {
      const first = TestBed.inject(CHAT_MODEL);
      const second = TestBed.inject(CHAT_MODEL);
      expect(first).toBe(second);
    });
  });
});
