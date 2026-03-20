import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { toSuccess } from '../../../shared/results/results';
import { chatsState } from '../../store/chats';
import { sendUserMessage, startNewChat } from '../../store/chats/chats.actions';
import { dialogsActions, dialogsState } from '../../store/dialogs';
import { ChatDialogComponent } from '../chat-dialog.component';
import { ChatDialogRequest } from '../chat-dialog.request';

describe('ChatDialogComponent', () => {
  let fixture: ComponentFixture<ChatDialogComponent>;
  let component: ChatDialogComponent;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatDialogComponent, ReactiveFormsModule],
      providers: [
        provideMockStore({
          initialState: {
            [dialogsState.FEATURE_KEY]: dialogsState.initialState,
            [chatsState.FEATURE_KEY]: chatsState.initialState,
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatDialogComponent);
    component = fixture.componentInstance;

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
  });

  it('should open dialog when top dialog is a ChatDialogRequest', () => {
    store.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [new ChatDialogRequest()],
      },
      [chatsState.FEATURE_KEY]: {
        messages: [],
      },
    });
    store.refreshState();
    fixture.detectChanges();

    component.ngAfterViewInit();

    const dialog = fixture.nativeElement.querySelector('dialog');
    expect(dialog.open).toBeTrue();
  });

  it('should close dialog when top dialog is not a ChatDialogRequest', () => {
    store.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [],
      },
      [chatsState.FEATURE_KEY]: {
        messages: [],
      },
    });
    store.refreshState();
    fixture.detectChanges();

    component.ngAfterViewInit();

    const dialog = fixture.nativeElement.querySelector('dialog');
    expect(dialog.open).toBeFalse();
  });

  it('should dispatch closeDialog action when close button clicked', () => {
    store.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [new ChatDialogRequest()],
      },
      [chatsState.FEATURE_KEY]: {
        messages: [],
      },
    });
    store.refreshState();
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector(
      '[data-testid="close-dialog"]',
    );
    closeBtn.click();

    expect(store.dispatch).toHaveBeenCalledWith(dialogsActions.closeDialog());
  });

  it('should dispatch startNewChat action when clear chat button clicked', () => {
    // Set state with some messages to show the "Clear chat" button
    store.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [new ChatDialogRequest()],
      },
      [chatsState.FEATURE_KEY]: {
        messages: [
          {
            id: '1',
            type: 'User',
            content: toSuccess({ output: 'Hello' }),
          },
        ],
      },
    });
    store.refreshState();
    fixture.detectChanges();

    const clearChatBtn = fixture.nativeElement.querySelector(
      '[data-testid="clear-chat"]',
    );
    clearChatBtn.click();

    expect(store.dispatch).toHaveBeenCalledWith(startNewChat());
  });

  it('should dispatch sendUserMessage and reset input on valid search submit', () => {
    store.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [new ChatDialogRequest()],
      },
      Chats: {
        messages: [],
      },
    });
    store.refreshState();
    fixture.detectChanges();

    component.searchControl.setValue('  hello world  ');
    fixture.detectChanges();
    component.onSearch();

    expect(store.dispatch).toHaveBeenCalledWith(
      sendUserMessage({ userInput: 'hello world' }),
    );
    expect(component.searchControl.value).toBeNull();
  });

  it('should not dispatch sendUserMessage on empty or whitespace search', () => {
    component.searchControl.setValue('   ');
    component.onSearch();

    expect(store.dispatch).not.toHaveBeenCalled();

    component.searchControl.setValue('');
    component.onSearch();

    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
