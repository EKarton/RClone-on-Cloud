import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  ImagesViewDropdownComponent,
  ImagesViewOptions,
} from '../images-view-dropdown.component';

describe('ImagesViewDropdownComponent', () => {
  let fixture: ComponentFixture<ImagesViewDropdownComponent>;
  let component: ImagesViewDropdownComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagesViewDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImagesViewDropdownComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('imagesViewOption', ImagesViewOptions.LIST);
    fixture.detectChanges();
  });

  it('should display "List" icon and label when option is LIST', () => {
    fixture.detectChanges();

    const button = getDropdownButton();
    expect(button.textContent).toContain('List');
    expect(getListRadio().checked).toBeTrue();
    expect(getMapRadio().checked).toBeFalse();
  });

  it('should display "Map" icon and label when option is MAP', () => {
    component.setImagesViewOption(ImagesViewOptions.MAP);
    fixture.detectChanges();

    const button = getDropdownButton();
    expect(button.textContent).toContain('Map');
    expect(getMapRadio().checked).toBeTrue();
    expect(getListRadio().checked).toBeFalse();
  });

  it('should update model to LIST when List radio button is clicked', () => {
    component.setImagesViewOption(ImagesViewOptions.MAP);
    fixture.detectChanges();

    const listRadio = getListRadio();
    listRadio.click();
    fixture.detectChanges();

    expect(component.imagesViewOption()).toBe(ImagesViewOptions.LIST);
    expect(listRadio.checked).toBeTrue();
    expect(getMapRadio().checked).toBeFalse();
  });

  it('should update model to MAP when Map radio button is clicked', () => {
    fixture.detectChanges();

    const mapRadio = getMapRadio();
    mapRadio.click();
    fixture.detectChanges();

    expect(component.imagesViewOption()).toBe(ImagesViewOptions.MAP);
    expect(mapRadio.checked).toBeTrue();
    expect(getListRadio().checked).toBeFalse();
  });

  function getDropdownButton(): HTMLElement {
    return fixture.nativeElement.querySelector('[role="button"]');
  }

  function getListRadio(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="list-view-radio-button"]',
    ) as HTMLInputElement;
  }

  function getMapRadio(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="map-view-radio-button"]',
    ) as HTMLInputElement;
  }
});
