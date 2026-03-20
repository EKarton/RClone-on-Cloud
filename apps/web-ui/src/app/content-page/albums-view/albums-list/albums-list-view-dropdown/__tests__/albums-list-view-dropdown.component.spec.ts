import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  AlbumsListViewDropdownComponent,
  ListViewOptions,
} from '../albums-list-view-dropdown.component';

describe('AlbumsListViewDropdownComponent', () => {
  let fixture: ComponentFixture<AlbumsListViewDropdownComponent>;
  let component: AlbumsListViewDropdownComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumsListViewDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AlbumsListViewDropdownComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('listViewOption', ListViewOptions.LIST);
    fixture.detectChanges();
  });

  it('should render List radio as selected when listViewOption is LIST', () => {
    expect(getListRadio().checked).toBeTrue();
    expect(getTableRadio().checked).toBeFalse();
  });

  it('should render Table radio as selected when listViewOption is TABLE', () => {
    component.setListViewOption(ListViewOptions.TABLE);
    fixture.detectChanges();

    expect(getTableRadio().checked).toBeTrue();
    expect(getListRadio().checked).toBeFalse();
  });

  it('should update to TABLE when Table radio is clicked', () => {
    getTableRadio().click();
    fixture.detectChanges();

    expect(component.listViewOption()).toBe(ListViewOptions.TABLE);
    expect(getTableRadio().checked).toBeTrue();
    expect(getListRadio().checked).toBeFalse();
  });

  it('should update to LIST when List radio is clicked given it was TABLE', () => {
    component.setListViewOption(ListViewOptions.TABLE);
    fixture.detectChanges();

    getListRadio().click();
    fixture.detectChanges();

    expect(component.listViewOption()).toBe(ListViewOptions.LIST);
    expect(getListRadio().checked).toBeTrue();
    expect(getTableRadio().checked).toBeFalse();
  });

  function getListRadio(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="list-view-radio-button"]',
    ) as HTMLInputElement;
  }

  function getTableRadio(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="table-view-radio-button"]',
    ) as HTMLInputElement;
  }
});
