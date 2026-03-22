import { FactoryProvider, InjectionToken } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Buffer } from 'buffer';
import { map, Observable } from 'rxjs';

export interface RemotePath {
  remote: string;
  path: string | undefined;
}

export const REMOTE_PATH$ = new InjectionToken<Observable<RemotePath>>(
  'REMOTE_PATH',
);

export const REMOTE_PATH$_PROVIDER: FactoryProvider = {
  provide: REMOTE_PATH$,
  useFactory: (route: ActivatedRoute) => {
    return route.paramMap.pipe(
      map((paramMap) => {
        const encodedRemotePath = paramMap.get('remotePath');

        if (!encodedRemotePath) {
          throw new Error('No remote path provided');
        }

        const remotePath = Buffer.from(encodedRemotePath, 'base64').toString();
        const [remote, path] = remotePath.split(':');

        if (!remote) {
          throw new Error('No remote provided');
        }

        return {
          remote,
          path: path || undefined,
        };
      }),
    );
  },
  deps: [ActivatedRoute],
};

export const REMOTE$ = new InjectionToken<Observable<string>>('REMOTE$');
export const PATH$ = new InjectionToken<Observable<string | undefined>>(
  'PATH$',
);

export const REMOTE$_PROVIDER: FactoryProvider = {
  provide: REMOTE$,
  useFactory: (remotePath$: Observable<RemotePath>) =>
    remotePath$.pipe(map((remotePath) => remotePath.remote)),
  deps: [REMOTE_PATH$],
};

export const PATH$_PROVIDER: FactoryProvider = {
  provide: PATH$,
  useFactory: (remotePath$: Observable<RemotePath>) =>
    remotePath$.pipe(map((remotePath) => remotePath.path)),
  deps: [REMOTE_PATH$],
};
