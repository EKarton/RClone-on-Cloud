import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FolderSortDropdownComponent } from '../folder-sort-dropdown.component';
import {
  ListAlbumsSortBy,
  ListAlbumsSortByFields,
  ListAlbumsSortDirection,
} from '../../../services/web-api/types/list-albums';

describe('FolderSortDropdownComponent', () => {
  let fixture: ComponentFixture<FolderSortDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolderSortDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FolderSortDropdownComponent);
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.ASCENDING,
    } satisfies ListAlbumsSortBy);
    fixture.detectChanges();
  });

  it('should render ID as the selected field text initially', () => {
    expect(getSummaryText()).toContain('ID');
  });

  it('should check the ID field radio initially', () => {
    expect(getRadioByLabel('ID')?.checked).toBe(true);
    expect(getRadioByLabel('Name')?.checked).toBe(false);
  });

  it('should check the Ascending direction radio initially', () => {
    expect(getRadioByLabel('Ascending')?.checked).toBe(true);
    expect(getRadioByLabel('Descending')?.checked).toBe(false);
  });

  it('should update summary text when input field changes to Name', () => {
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.NAME,
      direction: ListAlbumsSortDirection.ASCENDING,
    } satisfies ListAlbumsSortBy);
    fixture.detectChanges();

    expect(getSummaryText()).toContain('Name');
  });

  it('should update checked field radio when input field changes to Name', () => {
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.NAME,
      direction: ListAlbumsSortDirection.ASCENDING,
    } satisfies ListAlbumsSortBy);
    fixture.detectChanges();

    expect(getRadioByLabel('ID')?.checked).toBe(false);
    expect(getRadioByLabel('Name')?.checked).toBe(true);
  });

  it('should update checked direction radio when input direction changes to Descending', () => {
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.DESCENDING,
    } satisfies ListAlbumsSortBy);
    fixture.detectChanges();

    expect(getRadioByLabel('Ascending')?.checked).toBe(false);
    expect(getRadioByLabel('Descending')?.checked).toBe(true);
  });

  it('should render descending icon when input direction changes to Descending', () => {
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.DESCENDING,
    } satisfies ListAlbumsSortBy);
    fixture.detectChanges();

    expect(getSummaryIconPath()?.getAttribute('d')).toBe(
      'M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z',
    );
  });

  it('should update checked field radio when user selects Name', () => {
    clickRadio('Name');
    fixture.detectChanges();

    expect(getRadioByLabel('ID')?.checked).toBe(false);
    expect(getRadioByLabel('Name')?.checked).toBe(true);
    expect(getSummaryText()).toContain('Name');
  });

  it('should update checked direction radio when user selects Descending', () => {
    clickRadio('Descending');
    fixture.detectChanges();

    expect(getRadioByLabel('Ascending')?.checked).toBe(false);
    expect(getRadioByLabel('Descending')?.checked).toBe(true);
  });

  it('should update summary icon when user selects Descending', () => {
    clickRadio('Descending');
    fixture.detectChanges();

    expect(getSummaryIconPath()?.getAttribute('d')).toBe(
      'M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z',
    );
  });

  it('should preserve selected field when user changes direction', () => {
    clickRadio('Name');
    fixture.detectChanges();

    clickRadio('Descending');
    fixture.detectChanges();

    expect(getSummaryText()).toContain('Name');
    expect(getRadioByLabel('Name')?.checked).toBe(true);
    expect(getRadioByLabel('Descending')?.checked).toBe(true);
  });

  it('should preserve selected direction when user changes field', () => {
    clickRadio('Descending');
    fixture.detectChanges();

    clickRadio('Name');
    fixture.detectChanges();

    expect(getRadioByLabel('Name')?.checked).toBe(true);
    expect(getRadioByLabel('Descending')?.checked).toBe(true);
    expect(getSummaryText()).toContain('Name');
  });

  function getSummary(): HTMLElement {
    return fixture.nativeElement.querySelector('div[role="button"]') as HTMLElement;
  }

  function getSummaryText(): string {
    return getSummary().textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function getSummaryIconPath(): SVGPathElement | null {
    return getSummary().querySelector('svg path');
  }

  function getLabels(): HTMLLabelElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('label')) as HTMLLabelElement[];
  }

  function getLabelByText(text: string): HTMLLabelElement | undefined {
    return getLabels().find((label) => label.textContent?.replace(/\s+/g, ' ').trim() === text);
  }

  function getRadioByLabel(text: string): HTMLInputElement | undefined {
    return getLabelByText(text)?.querySelector('input[type="radio"]') as
      | HTMLInputElement
      | undefined;
  }

  function clickRadio(text: string): void {
    const radio = getRadioByLabel(text);

    expect(radio).toBeTruthy();

    radio!.dispatchEvent(new Event('change', { bubbles: true }));
  }
});
