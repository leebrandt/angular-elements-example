# Build a Reusable Component with Angular Elements

Code reuse can be significant in any software project. By reusing code, developers can drastically cut development and maintenance time for software projects. This is the reason that every framework for developing software has a way to encapsulate functionality and reuse it. Whether it's classes in C# and Java or modules in JavaScript, it's a safe bet that you've considered extracting some piece of functionality to reuse it somewhere else. The only place that has never had a good story for reusing code is in HTML. Until now.

Projects like [Stencil](https://stenciljs.com/) from the Ionic team, [SkateJS](https://skatejs.netlify.com/), and now [Angular Elements](https://angular.io/guide/elements) are making it easier than ever for developers to create components in the frameworks that they love and export them as [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) so that they can use them in projects that may or may not be written in those frameworks. In this tutorial, I'll show you how to create your first Angular Element and how to use it in a plain old HTML page!

## What You'll Need to Get Started with Angular Elements

You'll need just a few things installed to get started with Angular Elements:

- Angular CLI (version 6.0.8 at the time of this article)
- NPM (I'm using version 6.2.0)
- Node (I'm on version 10.8.0)

While it's not necessary, I'm using Visual Studio Code. It's super lightweight and works on all platforms.

## Start Your Angular Project

Start up a new Angular project using the Angular CLI:

```sh
ng new login-element
```

> You may notice that the generated project has quite a few vulnerabilities in the dependencies. You can fix all of them with `npm audit fix --force` from inside the `login-element` directory. I had no issues once this I did this, but double-check by running the project once you've fixed the vulnerabilities to check for yourself.

Once the Angular CLI has finished generating the new project and installing the dependencies, change into the `login-element` directory, and add `@angular/elements` to the package with the `ng add` command:

```sh
ng add @angular/elements --project=login-element
```

This command will add the `@angular/elements` packages and everything it needs to make web components including `document-register-element`, which is a lightweight version of the W3C Custom Elements specification. There is a problem with this package, however. The version installed at the time of writing is version 1.11.0, which I was unable to get working in Chrome 68. After some digging around in the GitHub repos for Angular elements, the [suggestion](https://github.com/angular/angular/issues/24556#issuecomment-398025955) that worked for me was to back the version of the Document Register Element package down to version 1.8.1 as it has better support across the browsers that support Custom Elements. The easiest way is to edit your `package.json` file and change the dependency `document-register-element` from `^1.7.2` to `1.8.1` and then re-run the `npm install` command. Remember, this is early days for Angular Elements, and the kinks are still being worked out.

## Why Okta for Authentication?

Authentication is something almost every web application needs these days. It's also one of those things that can be a real pain for developers. Not just the login screen, but an identity provider to handle creating and managing users. Since you'll be creating a reusable login component, you'll need to set up the identity service to handle user login and management. Okta is an excellent choice here as it will make creating, managing, and authorizing users a cinch. 

You can [sign up](https://developer.okta.com/signup/) a free forever developer account, and you're good to go!

## Create an Okta Application

To get started, you'll need to create an OpenID Connect application in Okta.

{% img blog/login-component/OktaSignUp.png alt:"Okta's sign up page." width:"800" %}{: .center-image }


Once you've logged in and landed on the dashboard page, copy down the Org URL pictured below. You will need this later.

{% img blog/login-component/OktaOrgUrl.png alt:"Okta developer dashboard highlighting the org URL." width:"800" %}{: .center-image }


Then create a new application by browsing to the **Applications** tab and clicking **Add Application**, and from the first page of the wizard choose **Single-Page App**.

{% img blog/login-component/CreateSpaAppScreenshot.png alt:"Create application wizard with Single Page App selected." width:"800" %}{: .center-image }


On the settings page, enter the following values:

- Name: Login Component
- Base URIs: http://localhost:8081
- Login redirect URIs: http://localhost:8081/implicit/callback

You can leave the other values unchanged, and click **Done**.

{% img blog/login-component/application-settings.png alt:"The settings page for the application." width:"800" %}{: .center-image }


Now that your application has been created copy down the Client ID value on the following page, you'll need them soon.

{% img blog/login-component/OktaAppSecrets.png alt:"The client ID" width:"800" %}{: .center-image }


Lastly, you'll need to bring in the `@okta/okta-auth-js` package to do the actual logging into Okta.

```sh
npm install @okta/okta-auth-js --save
```

Now, you're ready to start creating your component!

## Create Your Angular Element

For ease of use, you'll use the `app.component.ts` file to create the login component. The selector won't matter because when you set up the component to be exported, you'll assign a selector then.

Your `app.component.ts` should look like:

```ts
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
```

There is a lot to discuss here. First, you've set the encapsulation for the component to `ViewEncapsulation.Native`. This will ensure your component uses the native [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM). You've also imported Okta's JavaScript dependency.

Next, there are three `@Input`'s here. The `companyName` is merely for display, but the `oktaUrl` and `clientId` will be needed for the login component to work. Making these inputs means that users of the component, can set these values to their own Okta Org Url and set their ClientId. Also, in the `ngOnInit` lifecycle method you check to see if the user has already logged in. This will get the user's token from the `tokenManager` and set the component to display the welcome message instead of the login form if the user is already logged in when loading the page. This code will also handle a page refresh.

Lastly, the `login()` method. This uses the Okta `authClient` object to sign into Okta, and then get an `id_token` with the user's email and profile once you've gotten a session token from Okta with a username and password. Both of these return promises that you're `await`ing to make things a little more readable.

Next, you'll need the actual HTML elements for the component. Replace what's in the `app.component.html` file with the following:

{% raw %}

```html
<section class="login-form">
  <h1>{{companyName}} Login</h1>
  <div *ngIf="!isAuthenticated">
    <input type="email" #username name="username" id="username" placeholder="username">
    <input type="password" #password name="password" id="password" placeholder="password">
    <button (click)="login(username.value, password.value)">Login</button>
  </div>
  <div class="greeting" *ngIf="isAuthenticated">
    Welcome {{username}}!
  </div>
</section>
```

{% endraw %}

The above code is very straightforward if you've done much Angular at all. It is just displaying the login form if the user is not logged in and a welcome message if they are. The login form's button calls the `login()` method with the username and password entered.

Add a little styling to make it less boring:

```ts
.login-form {
  border: solid 1px #666;
  padding: 1rem;
  border-radius: 0.5rem;
  width: 25%;
  margin: auto;
}

input,
button {
  display: block;
  padding: 0.25rem;
  border-radius: 0.25rem;
  width: 95%;
  margin: 0.5rem;
}

.greeting {
  font-weight: bold;
  font-style: italic;
  font-size: 1.25rem;
}
```

Now you've got a component. All you need to do is to tell Angular that it is an Angular Element, and package it up so you can send it to all your friends!

## Make the Component an Angular Element

To make sure Angular knows this is meant to be a reusable Angular Element component, you'll need to make some changes to the `app.module.ts` file:

```ts
import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  providers: [],
  entryComponents: [AppComponent]
})
export class AppModule {
  constructor(private injector: Injector) {
    const el = createCustomElement(AppComponent, { injector });
    customElements.define('login-element', el);
  }
  ngDoBootstrap() {}
}
```

The first thing you might notice about the new module code is that it adds an `entryComponents` array to the `@NgModule` declaration. This tells Angular that rather than bootstrapping an Angular application from `AppComponent`, you're going to compile it and package it up to use as a Web Component. Also, the `AppModule` now has a constructor to set up the `createCustomElement()` function that takes the `AppComponent` and the injector. The injector will be used to create new instances of the component that live independent of one another. Then you define the custom element and the selector `login-element` that will be defined for its use in other applications. The last `ngDoBootstrap()` method circumvents the natural bootstrapping of the element since it won't be a regular Angular application.

## Package Your Angular Element

Now you're ready to package this thing up! There are several ways to do it, but here you'll use a couple of simple node packages and create a Node script to package everything into one file. By default, the Angular CLI will create four files. To see them, try running:

```sh
ng build --prod
```

You'll see a new `dist` folder with four JavaScript files in it. They'll have hashes in the names, and be a little harder to work with than is practical for distributing to people to use in their applications. To avoid all this, install a couple of npm packages to help out:

```sh
npm install --save-dev concat fs-extra
```

Then create a file in the root of the project called `build-elements.js` that you'll use in your npm scripts to pull all these into one file:

```js
const fs = require('fs-extra');
const concat = require('concat');

(async function build() {
  const files = [
    './dist/air/runtime.js',
    './dist/air/polyfills.js',
    './dist/air/scripts.js',
    './dist/air/main.js'
  ];

  await fs.ensureDir('elements');
  await concat(files, 'elements/login-element.js');
})();
```

Now, to make sure it will run and find each of these files, add a new script to your `package.json` file. I added mine right after the generated `build` script:

```json
"build:elements": "ng build --prod --output-hashing none && node build-elements.js",
```

This will run that `ng build --prod` with output hashing turned off so that the files won't be named `main.0476473b3749bc74928d.js`, but rather just `main.js`, making it easy for the `build-elements.js` script to find and concatenate them.

Build it now by running:

```sh
npm run build:elements
```

You will see a new folder called `elements` in your root folder with one file: `login-element.js` which you can easily use anywhere.

## Use Your Angular Element

In the new `elements` folder create an `Index.html` file and add the following contents, replacing the attribute values with your specific values:

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Document</title>
  <base href="/">
</head>

<body>

  <login-element company-name="{yourCompanyName}" okta-url="https://{yourOktaDomain}" client-id="{yourClientId}"></login-element>

  <script type="text/javascript" src="login-element.js"></script>

</body>

</html>
```

You can quickly run this by using a simple local HTTP server. `http-server is a simple package that serves any folder it is run in as a web folder. Install it with:

```sh
npm install -g http-server
```

Then run the HTTP server from inside the `elements` folder.

```sh
http-server
```

When you open `http://localhost:8081`, you will see the login component displayed. You can log in with your Okta user credentials and watch the component change to show your username in the welcome message.

{% img blog/login-component/LoginExample.png alt:"The application running." width:"600" %}{: .center-image }

Now you have a single file that you can distribute and reuse to add an Okta login to any web application that needs it. Whether that app is written in Angular, React, Vue, or just plain old HTML and JavaScript.

## Do Even More with Angular

Check out more tutorials on Angular:

- Matt Raible has a post describing [what's new in Angular 6](https://developer.okta.com/blog/2018/05/09/upgrade-to-angular-6)
- I recently wrote a post on [Upgrading your ASP.NET Core Angular template to Angular 6](https://developer.okta.com/blog/2018/08/02/aspnet-core-angular-crud)
- Ibrahim shows how to build a basic CRUD app with [Angular and ASP.NET Framework 4.x](https://developer.okta.com/blog/2018/07/27/build-crud-app-in-aspnet-framework-webapi-and-angular)
- Braden Kelley created a [CRUD-y SPA with Node and Angular](https://developer.okta.com/blog/2018/08/07/node-angular-crud)
- Matt Raible also makes it easy with [Spring Boot and Angular](https://developer.okta.com/blog/2017/12/04/basic-crud-angular-and-spring-boot)

If you have any questions, please don’t hesitate to leave a comment below, or ask us on our [Okta Developer Forums](https://devforum.okta.com/). Don't forget to follow us on Twitter [@OktaDev](https://twitter.com/oktadev), on [Facebook](https://www.facebook.com/oktadevelopers) and on [YouTube](https://www.youtube.com/channel/UC5AMiWqFVFxF1q9Ya1FuZ_Q/featured)!
