import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RcloneWebApiService, ListOperationsResponse } from '../../rclone-web-api/rclone-web-api.service';
import { Result } from '../../shared/results/results';
import { Observable, switchMap, map } from 'rxjs';

@Component({
  selector: 'app-directory-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-8 max-w-5xl mx-auto min-h-screen">
      <div class="flex items-center gap-4 mb-6">
        <a routerLink="/contents" class="btn btn-sm btn-ghost">&larr; Back to Remotes</a>
        <h2 class="text-3xl font-bold">Contents of {{ remoteId$ | async }}</h2>
      </div>

      <ng-container *ngIf="result$ | async as result">
        <div *ngIf="result.isLoading" class="flex justify-center p-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
        
        <div *ngIf="result.error" class="alert alert-error shadow-lg">
          <svg fill="none" class="stroke-current shrink-0 h-6 w-6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Failed to load directory. {{ result.error.message }}</span>
        </div>

        <div *ngIf="result.data && !result.isLoading" class="overflow-x-auto border border-base-300 rounded-lg shadow-sm">
          <table class="table w-full">
            <thead class="bg-base-200/50 text-base-content font-semibold text-sm">
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Path</th>
                <th>Size</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of result.data.list" class="hover opacity-90 transition-colors" [class.bg-base-200]="item.IsDir">
                <td>
                  <span class="badge badge-sm font-semibold" [ngClass]="item.IsDir ? 'badge-primary' : 'badge-ghost'">{{ item.IsDir ? 'DIR' : 'FILE' }}</span>
                </td>
                <td class="font-medium whitespace-nowrap">{{ item.Name }}</td>
                <td class="text-sm font-mono opacity-80 break-all">{{ item.Path }}</td>
                <td class="whitespace-nowrap font-mono text-sm">{{ item.Size >= 0 ? (item.Size | number) + ' B' : '-' }}</td>
                <td class="opacity-70 text-sm whitespace-nowrap">{{ item.ModTime | date:'short' }}</td>
              </tr>
              <tr *ngIf="result.data.list.length === 0">
                <td colspan="5" class="text-center py-8 text-base-content/50 italic">The remote directory is empty.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </div>
  `
})
export class DirectoryDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private rcloneService = inject(RcloneWebApiService);

  remoteId$!: Observable<string>;
  result$!: Observable<Result<ListOperationsResponse>>;

  ngOnInit() {
    this.remoteId$ = this.route.paramMap.pipe(
      map(params => (params.get('id') ?? '').replace(/:$/, '')) // strip colon if present from url
    );

    this.result$ = this.remoteId$.pipe(
      switchMap(id => this.rcloneService.listOperations(`${id}:`)) 
    );
  }
}
