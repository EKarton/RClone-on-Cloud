import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WINDOW } from '../../../app.tokens';
import { AppUpdateService } from '../app-update.service';

describe('AppUpdateService', () => {
  let service: AppUpdateService;

  let versionUpdates$: Subject<VersionReadyEvent>;
  let unrecoverable$: Subject<{ reason: string }>;

  let swUpdateMock: {
    isEnabled: boolean;
    checkForUpdate: ReturnType<typeof vi.fn>;
    versionUpdates: Subject<VersionReadyEvent>;
    unrecoverable: Subject<{ reason: string }>;
  };

  let windowMock: {
    confirm: ReturnType<typeof vi.fn>;
    alert: ReturnType<typeof vi.fn>;
    location: {
      reload: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    versionUpdates$ = new Subject<VersionReadyEvent>();
    unrecoverable$ = new Subject<{ reason: string }>();

    swUpdateMock = {
      isEnabled: true,
      checkForUpdate: vi.fn().mockResolvedValue(false),
      versionUpdates: versionUpdates$,
      unrecoverable: unrecoverable$,
    };

    windowMock = {
      confirm: vi.fn().mockReturnValue(false),
      alert: vi.fn(),
      location: {
        reload: vi.fn(),
      },
    };

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
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('does nothing when service-worker updates are disabled', () => {
    swUpdateMock.isEnabled = false;

    service.initialize();
    versionUpdates$.next(versionReadyEvent());

    expect(swUpdateMock.checkForUpdate).not.toHaveBeenCalled();
    expect(windowMock.confirm).not.toHaveBeenCalled();
    expect(windowMock.location.reload).not.toHaveBeenCalled();
  });

  it('checks for an update immediately when initialized', () => {
    service.initialize();

    expect(swUpdateMock.checkForUpdate).toHaveBeenCalledOnce();
  });

  it('checks for updates every hour', () => {
    vi.useFakeTimers();

    service.initialize();
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(swUpdateMock.checkForUpdate).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(swUpdateMock.checkForUpdate).toHaveBeenCalledTimes(3);
  });

  it('asks the user to reload when an update is ready', () => {
    service.initialize();
    versionUpdates$.next(versionReadyEvent());

    expect(windowMock.confirm).toHaveBeenCalledWith(
      'A new version of RClone on Cloud is available. Reload now?',
    );
  });

  it('reloads when the user accepts the update', () => {
    windowMock.confirm.mockReturnValue(true);

    service.initialize();
    versionUpdates$.next(versionReadyEvent());

    expect(windowMock.location.reload).toHaveBeenCalledOnce();
  });

  it('does not reload when the user declines the update', () => {
    windowMock.confirm.mockReturnValue(false);

    service.initialize();
    versionUpdates$.next(versionReadyEvent());

    expect(windowMock.location.reload).not.toHaveBeenCalled();
  });

  it('alerts and reloads after an unrecoverable service-worker error', () => {
    service.initialize();

    unrecoverable$.next({
      reason: 'Cached app version is inconsistent',
    });

    expect(windowMock.alert).toHaveBeenCalledWith(
      'RClone on Cloud needs to reload because an update could not be applied.',
    );
    expect(windowMock.location.reload).toHaveBeenCalledOnce();
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
