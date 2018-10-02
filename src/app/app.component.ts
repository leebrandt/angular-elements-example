import { Component, Input, ViewEncapsulation, OnInit } from '@angular/core';
import * as OktaAuth from '@okta/okta-auth-js';

@Component({
  selector: 'login-element',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.Native
})
export class AppComponent implements OnInit {
  @Input()
  companyName = 'ACME Corporation';

  @Input()
  oktaUrl: string;

  @Input()
  clientId: string;

  authClient: any;
  isAuthenticated: boolean;
  username: string;
  password: string;
  token: any;

  ngOnInit() {
    console.log(this.companyName, this.oktaUrl, this.clientId);
    this.authClient = new OktaAuth({
      url: this.oktaUrl,
      issuer: `${this.oktaUrl}/oauth2/default`,
      redirectUri: `http://localhost:${window.location.port}/implicit/callback`,
      clientId: this.clientId
    });

    this.token = this.authClient.tokenManager.get('idToken');
    if (this.token) {
      this.isAuthenticated = true;
      this.username = this.token.claims.email;
    } else {
      this.isAuthenticated = false;
    }
  }

  async login(username, password) {
    let signInResponse: any;

    try {
      signInResponse = await this.authClient.signIn({ username, password });
      if (signInResponse.status === 'SUCCESS') {
        this.token = await this.authClient.token.getWithoutPrompt({
          sessionToken: signInResponse.sessionToken,
          responseType: 'id_token',
          scopes: ['openid', 'email', 'profile']
        });
        if (this.token) {
          this.authClient.tokenManager.add('idToken', this.token);
          this.isAuthenticated = true;
          this.username = this.token.claims.email;
        }
      } else {
        throw `transaction status ${
          signInResponse.status
        } could not be handled.`;
      }
    } catch (error) {
      console.log(error);
    }
  }
}
