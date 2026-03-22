import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import {
  toFailure,
  toPending,
  toSuccess,
} from '../../../../shared/results/results';
import { ListRemoteUsageResponse } from '../../../services/web-api/types/list-remote-usage';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { RemoteCardComponent } from '../remote-card.component';

describe('RemoteCardComponent', () => {
  let webApiService: jasmine.SpyObj<WebApiService>;

  beforeEach(() => {
    webApiService = jasmine.createSpyObj('WebApiService', ['listRemoteUsage']);

    TestBed.configureTestingModule({
      imports: [RemoteCardComponent],
      providers: [
        { provide: WebApiService, useValue: webApiService },
        provideMockStore(),
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should display the remote name', () => {
    webApiService.listRemoteUsage.and.returnValue(
      of(toPending<ListRemoteUsageResponse>()),
    );

    const fixture = TestBed.createComponent(RemoteCardComponent);
    fixture.componentRef.setInput('remote', 'test-remote');
    fixture.detectChanges();

    const remoteName = fixture.nativeElement.querySelector(
      '[data-testid="remote-card-name"]',
    );
    expect(remoteName.textContent).toContain('test-remote');
  });

  it('should display full space info when all data is present', () => {
    const mockResponse: ListRemoteUsageResponse = {
      used: 1000 * 1000, // 1MB
      total: 1000 * 1000 * 10, // 10MB
      trashed: 1000 * 500, // 500KB
    };
    webApiService.listRemoteUsage.and.returnValue(of(toSuccess(mockResponse)));

    const fixture = TestBed.createComponent(RemoteCardComponent);
    fixture.componentRef.setInput('remote', 'test-remote');
    fixture.detectChanges();

    const spaceInfo = fixture.nativeElement.querySelector(
      '[data-testid="remote-space-info"]',
    );
    expect(spaceInfo.textContent).toContain('1 MB / 10 MB used');
    expect(spaceInfo.textContent).toContain('500 kB in trash');
  });

  it('should display partial space info when fields are missing', () => {
    const mockResponse: ListRemoteUsageResponse = {
      used: 1000 * 1000,
      // total and trashed are missing
    };
    webApiService.listRemoteUsage.and.returnValue(of(toSuccess(mockResponse)));

    const fixture = TestBed.createComponent(RemoteCardComponent);
    fixture.componentRef.setInput('remote', 'test-remote');
    fixture.detectChanges();

    const spaceInfo = fixture.nativeElement.querySelector(
      '[data-testid="remote-space-info"]',
    );
    expect(spaceInfo.textContent).toContain('1 MB used');
    expect(spaceInfo.textContent).not.toContain('/');
    expect(spaceInfo.textContent).not.toContain('in trash');
  });

  it('should display only trash info if only trashed is present', () => {
    const mockResponse: ListRemoteUsageResponse = {
      trashed: 1000 * 1000,
    };
    webApiService.listRemoteUsage.and.returnValue(of(toSuccess(mockResponse)));

    const fixture = TestBed.createComponent(RemoteCardComponent);
    fixture.componentRef.setInput('remote', 'test-remote');
    fixture.detectChanges();

    const spaceInfo = fixture.nativeElement.querySelector(
      '[data-testid="remote-space-info"]',
    );
    expect(spaceInfo.textContent).not.toContain('used');
    expect(spaceInfo.textContent).toContain('1 MB in trash');
  });

  it('should display a skeleton when loading usage info', () => {
    webApiService.listRemoteUsage.and.returnValue(
      of(toPending<ListRemoteUsageResponse>()),
    );

    const fixture = TestBed.createComponent(RemoteCardComponent);
    fixture.componentRef.setInput('remote', 'test-remote');
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector(
      '[data-testid="remote-space-skeleton"]',
    );
    expect(skeleton).toBeTruthy();
  });

  it('should display an error message on usage fetch failure', () => {
    webApiService.listRemoteUsage.and.returnValue(
      of(toFailure<ListRemoteUsageResponse>(new Error('API Error'))),
    );

    const fixture = TestBed.createComponent(RemoteCardComponent);
    fixture.componentRef.setInput('remote', 'test-remote');
    fixture.detectChanges();

    const errorMessage = fixture.nativeElement.querySelector(
      '[data-testid="remote-space-error"]',
    );
    expect(errorMessage.textContent).toContain(
      'Unable to get space information',
    );
  });
});
