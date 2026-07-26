import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppUpdateService } from '../../services/app-update.service';
import { PwaUpdateBannerComponent } from '../pwa-update-banner.component';

describe('PwaUpdateBannerComponent', () => {
  let fixture: ComponentFixture<PwaUpdateBannerComponent>;

  const updateAvailable = signal(false);
  const unrecoverableError = signal(false);

  const appUpdateServiceMock = {
    updateAvailable,
    unrecoverableError,
    reload: vi.fn(),
  };

  beforeEach(async () => {
    updateAvailable.set(false);
    unrecoverableError.set(false);

    await TestBed.configureTestingModule({
      imports: [PwaUpdateBannerComponent],
      providers: [
        {
          provide: AppUpdateService,
          useValue: appUpdateServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PwaUpdateBannerComponent);
  });

  afterEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('creates', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('does not render an alert by default', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('renders the update notification when an update is available', () => {
    updateAvailable.set(true);
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;

    expect(alert).not.toBeNull();
    expect(alert.classList).toContain('alert-info');
    expect(alert.textContent).toContain('Update available');
    expect(alert.textContent).toContain('A new version is ready to use.');
  });

  it('reloads after clicking Reload on the update notification', () => {
    updateAvailable.set(true);
    fixture.detectChanges();

    const reloadButton = fixture.nativeElement.querySelector(
      '[data-testid="reload-button-2"]',
    ) as HTMLButtonElement;
    reloadButton.click();

    expect(appUpdateServiceMock.reload).toHaveBeenCalledOnce();
  });

  it('renders the recovery notification after an unrecoverable error', () => {
    unrecoverableError.set(true);
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;

    expect(alert).not.toBeNull();
    expect(alert.classList).toContain('alert-error');
    expect(alert.textContent).toContain('Reload required');
    expect(alert.textContent).toContain('RClone on Cloud needs to reload to recover.');
  });

  it('reloads after clicking Reload now on the recovery notification', () => {
    unrecoverableError.set(true);
    fixture.detectChanges();

    const reloadButton = fixture.nativeElement.querySelector(
      '[data-testid="reload-button-1"]',
    ) as HTMLButtonElement;
    reloadButton.click();

    expect(appUpdateServiceMock.reload).toHaveBeenCalledOnce();
  });

  it('prioritizes the recovery notification over the normal update notification', () => {
    updateAvailable.set(true);
    unrecoverableError.set(true);
    fixture.detectChanges();

    const alerts = fixture.nativeElement.querySelectorAll(
      '[role="alert"]',
    ) as NodeListOf<HTMLElement>;

    expect(alerts).toHaveLength(1);
    expect(alerts[0].classList).toContain('alert-error');
    expect(alerts[0].textContent).toContain('Reload required');
  });
});
