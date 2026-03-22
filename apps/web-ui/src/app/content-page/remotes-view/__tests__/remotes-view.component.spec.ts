import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import {
  toFailure,
  toPending,
  toSuccess,
} from '../../../shared/results/results';
import { ListRemotesResponse } from '../../services/web-api/types/list-remotes';
import { WebApiService } from '../../services/web-api/web-api.service';
import { RemotesViewComponent } from '../remotes-view.component';

describe('RemotesViewComponent', () => {
  let webApiService: jasmine.SpyObj<WebApiService>;

  beforeEach(() => {
    webApiService = jasmine.createSpyObj('WebApiService', ['listRemotes']);

    TestBed.configureTestingModule({
      imports: [RemotesViewComponent],
      providers: [
        { provide: WebApiService, useValue: webApiService },
        provideMockStore(),
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should display the list of remotes on success', () => {
    const mockResponse: ListRemotesResponse = {
      remotes: ['remote1', 'remote2'],
    };
    webApiService.listRemotes.and.returnValue(of(toSuccess(mockResponse)));

    const fixture = TestBed.createComponent(RemotesViewComponent);
    fixture.detectChanges();

    const remoteCards =
      fixture.nativeElement.querySelectorAll('app-remote-card');
    expect(remoteCards.length).toBe(2);
    expect(webApiService.listRemotes).toHaveBeenCalled();
  });

  it('should display a skeleton when loading', () => {
    webApiService.listRemotes.and.returnValue(
      of(toPending<ListRemotesResponse>()),
    );

    const fixture = TestBed.createComponent(RemotesViewComponent);
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector(
      '[data-testid="remote-skeleton"]',
    );
    expect(skeleton).toBeTruthy();
  });

  it('should display an error message on failure', () => {
    const error = new Error('API Error');
    webApiService.listRemotes.and.returnValue(
      of(toFailure<ListRemotesResponse>(error)),
    );

    const fixture = TestBed.createComponent(RemotesViewComponent);
    fixture.detectChanges();

    const errorMessage = fixture.nativeElement.querySelector(
      '[data-testid="remotes-error"]',
    );
    expect(errorMessage.textContent).toContain('Error: API Error');
  });
});
