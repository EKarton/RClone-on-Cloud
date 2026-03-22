import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Buffer } from 'buffer';
import { of } from 'rxjs';

import {
  REMOTE_PATH$,
  REMOTE_PATH$_PROVIDER,
} from '../folder-list-view.tokens';

describe('REMOTE_PATH$ Token', () => {
  it('should throw error if no remotePath is provided', (done) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({ get: () => null }),
          },
        },
        REMOTE_PATH$_PROVIDER,
      ],
    });

    const remotePath$ = TestBed.inject(REMOTE_PATH$);
    remotePath$.subscribe({
      error: (err) => {
        expect(err.message).toBe('No remote path provided');
        done();
      },
    });
  });

  it('should throw error if no remote is provided', (done) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: () => Buffer.from(':pathOnly').toString('base64'),
            }),
          },
        },
        REMOTE_PATH$_PROVIDER,
      ],
    });

    const remotePath$ = TestBed.inject(REMOTE_PATH$);
    remotePath$.subscribe({
      error: (err) => {
        expect(err.message).toBe('No remote provided');
        done();
      },
    });
  });

  it('should parse valid remotePath from paramMap correctly', (done) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: () => Buffer.from('my-remote:some/dir').toString('base64'),
            }),
          },
        },
        REMOTE_PATH$_PROVIDER,
      ],
    });

    const remotePath$ = TestBed.inject(REMOTE_PATH$);
    remotePath$.subscribe((result) => {
      expect(result).toEqual({ remote: 'my-remote', path: 'some/dir' });
      done();
    });
  });
});
