import { Component } from '@angular/core';
import { environment } from '../../environment/environment';

@Component({
  selector: 'app-home-page',
  standalone: true,
  template: `
    <div class="hero min-h-screen bg-base-200">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1 class="text-5xl font-bold">RClone Cloud</h1>
          <p class="py-6">Manage your remote files securely through the web with your configured RClone backends.</p>
          <button class="btn btn-primary" (click)="login()">Login with Google</button>
        </div>
      </div>
    </div>
  `
})
export class HomePageComponent {
  login() {
    window.location.href = environment.loginUrl;
  }
}
