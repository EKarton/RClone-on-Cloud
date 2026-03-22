import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Buffer } from 'buffer';
import { of } from 'rxjs';

import { REMOTE_PATH$, REMOTE_PATH$_PROVIDER } from '../folder-list-view.tokens';

describe('REMOTE_PATH$ Token', () => {
  it('should throw error if no remotePath is provided', async () => {
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
    const promise = new Promise<void>((resolve, reject) => {
      remotePath$.subscribe({
        next: () => reject('Should have failed'),
        error: (err) => {
          expect(err.message).toBe('No remote path provided');
          resolve();
        },
      });
    });
    await promise;
  });

  it('should throw error if no remote is provided', async () => {
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
    const promise = new Promise<void>((resolve, reject) => {
      remotePath$.subscribe({
        next: () => reject('Should have failed'),
        error: (err) => {
          expect(err.message).toBe('No remote provided');
          resolve();
        },
      });
    });
    await promise;
  });

  it('should parse valid remotePath from paramMap correctly', async () => {
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
    const promise = new Promise<void>((resolve) => {
      remotePath$.subscribe((result) => {
        expect(result).toEqual({ remote: 'my-remote', path: 'some/dir' });
        resolve();
      });
    });
    await promise;
  });
});
