import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { environment } from '../../../environments/environment';
import { WINDOW } from '../../app.tokens';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';

@Component({
  selector: 'app-login-page',
  standalone: true,
  templateUrl: './login-page.component.html',
  imports: [CommonModule],
})
export class LoginPageComponent implements OnInit {
  private readonly window: Window = inject(WINDOW);
  private readonly cookieService = inject(CookieService);

  async ngOnInit() {
    const state = crypto.randomUUID();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    this.cookieService.set('oauth_state', state, 300, '/', undefined, true, 'Lax');
    this.cookieService.set('oauth_verifier', codeVerifier, 300, '/', undefined, true, 'Lax');

    this.window.location.href = `${environment.loginUrl}?select_account=true&state=${state}&code_challenge_method=S256&challenge=${codeChallenge}`;
  }
}
