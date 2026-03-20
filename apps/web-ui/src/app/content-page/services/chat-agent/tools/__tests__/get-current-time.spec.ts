import { TestBed } from '@angular/core/testing';

import { CurrentTimeOutput, CurrentTimeTool } from '../get-current-time';

describe('CurrentTimeTool', () => {
  let tool: CurrentTimeTool;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CurrentTimeTool],
    });
    tool = TestBed.inject(CurrentTimeTool);
  });

  it('should create the tool', () => {
    expect(tool).toBeTruthy();
    expect(tool.name).toBe('CurrentTimeTool');
    expect(tool.description).toContain('returns the current time');
  });

  it('should return current time in ISO format', async () => {
    const result: CurrentTimeOutput = await tool.invoke({});

    const date = new Date(result.timestamp);
    expect(date.toISOString()).toBe(result.timestamp);
  });
});
