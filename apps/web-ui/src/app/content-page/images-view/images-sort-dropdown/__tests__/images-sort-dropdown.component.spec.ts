import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  ListMediaItemsSortByFields,
  ListMediaItemsSortDirection,
} from '../../../services/web-api/types/list-media-items';
import { ImagesSortDropdownComponent } from '../images-sort-dropdown.component';

describe('ImagesSortDropdownComponent', () => {
  let fixture: ComponentFixture<ImagesSortDropdownComponent>;
  let component: ImagesSortDropdownComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagesSortDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImagesSortDropdownComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('sortBy', {
      field: ListMediaItemsSortByFields.ID,
      direction: ListMediaItemsSortDirection.ASCENDING,
    });

    fixture.detectChanges();
  });

  it('should update field to DATE_TAKEN when Date Taken radio is clicked', () => {
    const dateRadio = getSortByDateTakenRadioButton();
    dateRadio.click();
    fixture.detectChanges();

    expect(component.sortBy().field).toBe(
      ListMediaItemsSortByFields.DATE_TAKEN,
    );
    expect(dateRadio.checked).toBeTrue();
    expect(getSortByIdRadioButton().checked).toBeFalse();
  });

  it('should update field to ID when ID radio is clicked given field is in DATE_TAKEN', () => {
    component.setField(ListMediaItemsSortByFields.DATE_TAKEN);
    fixture.detectChanges();

    const idRadio = getSortByIdRadioButton();
    idRadio.click();
    fixture.detectChanges();

    expect(component.sortBy().field).toBe(ListMediaItemsSortByFields.ID);
    expect(idRadio.checked).toBeTrue();
    expect(getSortByDateTakenRadioButton().checked).toBeFalse();
  });

  it('should update direction to DESCENDING when Descending radio is clicked', () => {
    const descRadio = getSortDescendingRadioButton();
    descRadio.click();
    fixture.detectChanges();

    expect(component.sortBy().direction).toBe(
      ListMediaItemsSortDirection.DESCENDING,
    );
    expect(descRadio.checked).toBeTrue();
    expect(getSortAscendingRadioButton().checked).toBeFalse();
  });

  it('should update direction to ASCENDING when Ascending radio is clicked given direction is DESCENDING', () => {
    component.setDirection(ListMediaItemsSortDirection.DESCENDING);
    fixture.detectChanges();

    const ascRadio = getSortAscendingRadioButton();
    ascRadio.click();
    fixture.detectChanges();

    expect(component.sortBy().direction).toBe(
      ListMediaItemsSortDirection.ASCENDING,
    );
    expect(ascRadio.checked).toBeTrue();
    expect(getSortDescendingRadioButton().checked).toBeFalse();
  });

  it('should compute correct text for sortByFieldText', () => {
    component.setField(ListMediaItemsSortByFields.ID);
    fixture.detectChanges();
    expect(component.sortByFieldText()).toBe('ID');

    component.setField(ListMediaItemsSortByFields.DATE_TAKEN);
    fixture.detectChanges();
    expect(component.sortByFieldText()).toBe('Date Taken');
  });

  function getSortByIdRadioButton(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="sort-by-id-radio-button"]',
    ) as HTMLInputElement;
  }

  function getSortByDateTakenRadioButton(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="sort-by-date-taken-radio-button"]',
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
