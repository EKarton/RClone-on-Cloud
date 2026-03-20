import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  ListAlbumsSortByFields,
  ListAlbumsSortDirection,
} from '../../../../services/web-api/types/list-albums';
import { AlbumsSortDropdownComponent } from '../albums-sort-dropdown.component';

describe('AlbumsSortDropdownComponent', () => {
  let fixture: ComponentFixture<AlbumsSortDropdownComponent>;
  let component: AlbumsSortDropdownComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumsSortDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AlbumsSortDropdownComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.ASCENDING,
    });
    fixture.detectChanges();
  });

  it('should update field to NAME when Name radio is clicked', () => {
    const nameRadio = getSortByNameRadioButton();
    nameRadio.click();
    fixture.detectChanges();

    expect(component.sortBy().field).toBe(ListAlbumsSortByFields.NAME);
    expect(nameRadio.checked).toBeTrue();
    expect(getSortByIdRadioButton().checked).toBeFalse();
  });

  it('should update field to ID when ID radio is clicked given field is in NAME', () => {
    component.setField(ListAlbumsSortByFields.NAME);
    fixture.detectChanges();

    const idRadio = getSortByIdRadioButton();
    idRadio.click();
    fixture.detectChanges();

    expect(component.sortBy().field).toBe(ListAlbumsSortByFields.ID);
    expect(idRadio.checked).toBeTrue();
    expect(getSortByNameRadioButton().checked).toBeFalse();
  });

  it('should update direction to DESCENDING when Descending radio is clicked', () => {
    const descRadio = getSortDescendingRadioButton();
    descRadio.click();
    fixture.detectChanges();

    expect(component.sortBy().direction).toBe(
      ListAlbumsSortDirection.DESCENDING,
    );
    expect(descRadio.checked).toBeTrue();
    expect(getSortAscendingRadioButton().checked).toBeFalse();
  });

  it('should update direction to ASCENDING when Ascending radio is clicked given radio is in DESCENDING', () => {
    component.setDirection(ListAlbumsSortDirection.DESCENDING);
    fixture.detectChanges();

    const ascRadio = getSortAscendingRadioButton();
    ascRadio.click();
    fixture.detectChanges();

    expect(component.sortBy().direction).toBe(
      ListAlbumsSortDirection.ASCENDING,
    );
    expect(ascRadio.checked).toBeTrue();
    expect(getSortDescendingRadioButton().checked).toBeFalse();
  });

  it('should compute correct text for sortByFieldText', () => {
    component.setField(ListAlbumsSortByFields.ID);
    fixture.detectChanges();
    expect(component.sortByFieldText()).toBe('ID');

    component.setField(ListAlbumsSortByFields.NAME);
    fixture.detectChanges();
    expect(component.sortByFieldText()).toBe('Name');
  });

  function getSortByIdRadioButton(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="sort-by-id-radio-button"]',
    ) as HTMLInputElement;
  }

  function getSortByNameRadioButton(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="sort-by-name-radio-button"]',
    ) as HTMLInputElement;
  }

  function getSortAscendingRadioButton(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="sort-ascending-radio-button"]',
    ) as HTMLInputElement;
  }

  function getSortDescendingRadioButton(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="sort-descending-radio-button"]',
    ) as HTMLInputElement;
  }
});
