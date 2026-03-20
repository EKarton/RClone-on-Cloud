import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RcloneWebApiService, ListRemotesResponse } from '../rclone-web-api/rclone-web-api.service';
import { Result } from '../shared/results/results';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-contents-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-8 max-w-4xl mx-auto min-h-screen">
      <h2 class="text-3xl font-bold mb-6">Your Remotes</h2>

      <ng-container *ngIf="result$ | async as result">
        <div *ngIf="result.isLoading" class="flex justify-center p-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
        
        <div *ngIf="result.error" class="alert alert-error shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Error! {{ result.error.message }}</span>
        </div>

        <div *ngIf="result.data && !result.isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div *ngFor="let remote of result.data.remotes" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer border border-base-300" [routerLink]="['/contents', remote]">
            <div class="card-body">
              <h3 class="card-title text-primary text-2xl font-semibold break-all">
                {{ remote }}
              </h3>
              <p class="text-sm text-base-content/70 mt-2">Click to view contents</p>
            </div>
          </div>
        </div>

        <div *ngIf="result.data?.remotes?.length === 0" class="text-center py-12 text-base-content opacity-50">
          No remotes configured.
        </div>
      </ng-container>
    </div>
  `
})
export class ContentsPageComponent implements OnInit {
  private rcloneService = inject(RcloneWebApiService);
  
  result$!: Observable<Result<ListRemotesResponse>>;

  ngOnInit() {
    this.result$ = this.rcloneService.listRemotes();
  }
}
