import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent, VersionReadyEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WINDOW } from '../../../app.tokens';
import { AppUpdateService } from '../app-update.service';

describe('AppUpdateService', () => {
  let service: AppUpdateService;

  let versionUpdates$: Subject<VersionEvent>;
  let unrecoverable$: Subject<{ reason: string }>;

  const checkForUpdate = vi.fn<() => Promise<boolean>>();
  const reload = vi.fn();
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const swUpdateMock = {
    isEnabled: true,
    checkForUpdate,
    versionUpdates: undefined as unknown as Subject<VersionEvent>,
    unrecoverable: undefined as unknown as Subject<{ reason: string }>,
  };

  const windowMock = {
    location: {
      reload,
    },
  };

  beforeEach(() => {
    versionUpdates$ = new Subject<VersionEvent>();
    unrecoverable$ = new Subject<{ reason: string }>();

    checkForUpdate.mockResolvedValue(false);
    swUpdateMock.isEnabled = true;
    swUpdateMock.versionUpdates = versionUpdates$;
    swUpdateMock.unrecoverable = unrecoverable$;

    TestBed.configureTestingModule({
      providers: [
        AppUpdateService,
        {
          provide: SwUpdate,
          useValue: swUpdateMock,
        },
        {
          provide: WINDOW,
          useValue: windowMock,
        },
      ],
    });

    service = TestBed.inject(AppUpdateService);
  });

  afterEach(() => {
    service.shutdown();

    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();

    TestBed.resetTestingModule();
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('does nothing when service-worker updates are disabled', () => {
    swUpdateMock.isEnabled = false;

    service.initialize();

    expect(checkForUpdate).not.toHaveBeenCalled();
    expect(service.updateAvailable()).toBe(false);
    expect(service.unrecoverableError()).toBe(false);
  });

  it('checks for an update immediately when initialized', () => {
    service.initialize();

    expect(checkForUpdate).toHaveBeenCalledOnce();
  });

  it('checks for updates every hour', () => {
    vi.useFakeTimers();

    service.initialize();

    expect(checkForUpdate).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(checkForUpdate).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(checkForUpdate).toHaveBeenCalledTimes(3);
  });

  it('sets updateAvailable when a new version is ready', () => {
    service.initialize();

    versionUpdates$.next(versionReadyEvent());

    expect(service.updateAvailable()).toBe(true);
    expect(service.unrecoverableError()).toBe(false);
  });

  it('sets unrecoverableError when the service worker enters an unrecoverable state', () => {
    service.initialize();

    unrecoverable$.next({
      reason: 'Cached app version is inconsistent',
    });

    expect(consoleError).toHaveBeenCalledWith(
      'Unrecoverable service-worker state:',
      'Cached app version is inconsistent',
    );
    expect(service.unrecoverableError()).toBe(true);
  });

  it('reloads the browser when reload is called', () => {
    service.reload();

    expect(reload).toHaveBeenCalledOnce();
  });

  it('stops listening for version events after shutdown', () => {
    service.initialize();
    service.shutdown();

    versionUpdates$.next(versionReadyEvent());

    expect(service.updateAvailable()).toBe(false);
  });

  it('stops hourly update checks after shutdown', () => {
    vi.useFakeTimers();

    service.initialize();
    service.shutdown();

    vi.advanceTimersByTime(2 * 60 * 60 * 1000);

    expect(checkForUpdate).toHaveBeenCalled();
  });

  function versionReadyEvent(): VersionReadyEvent {
    return {
      type: 'VERSION_READY',
      currentVersion: {
        hash: 'old-version',
        appData: {},
      },
      latestVersion: {
        hash: 'new-version',
        appData: {},
      },
    };
  }
});
