import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  FolderDisplayDropdownComponent,
  ListViewOptions,
} from '../folder-display-dropdown.component';

describe('FolderDisplayDropdownComponent', () => {
  let fixture: ComponentFixture<FolderDisplayDropdownComponent>;
  let component: FolderDisplayDropdownComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolderDisplayDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FolderDisplayDropdownComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('listViewOption', ListViewOptions.LIST);
    fixture.detectChanges();
  });

  it('should render List radio as selected when listViewOption is LIST', () => {
    expect(getListRadio().checked).toBe(true);
    expect(getTableRadio().checked).toBe(false);
  });

  it('should render Table radio as selected when listViewOption is TABLE', () => {
    component.setListViewOption(ListViewOptions.TABLE);
    fixture.detectChanges();

    expect(getTableRadio().checked).toBe(true);
    expect(getListRadio().checked).toBe(false);
  });

  it('should update to TABLE when Table radio is clicked', () => {
    getTableRadio().click();
    fixture.detectChanges();

    expect(component.listViewOption()).toBe(ListViewOptions.TABLE);
    expect(getTableRadio().checked).toBe(true);
    expect(getListRadio().checked).toBe(false);
  });

  it('should update to LIST when List radio is clicked given it was TABLE', () => {
    component.setListViewOption(ListViewOptions.TABLE);
    fixture.detectChanges();

    getListRadio().click();
    fixture.detectChanges();

    expect(component.listViewOption()).toBe(ListViewOptions.LIST);
    expect(getListRadio().checked).toBe(true);
    expect(getTableRadio().checked).toBe(false);
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
