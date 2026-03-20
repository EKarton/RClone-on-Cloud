import { createActionGroup, props } from '@ngrx/store';

export const authActions = createActionGroup({
  source: 'Auth',
  events: {
    'Load Auth': props<{ code: string }>(),
    'Load Auth Success': props<{ token: string }>(),
    'Load Auth Failure': props<{ error: string }>(),
  },
});
