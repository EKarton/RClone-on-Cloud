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
