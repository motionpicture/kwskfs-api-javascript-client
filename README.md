<img src="https://motionpicture.jp/images/common/logo_01.svg" alt="motionpicture" title="motionpicture" align="right" height="56" width="98"/>

# KWSKFS API client library for Javascript

[![npm (scoped)](https://img.shields.io/npm/v/@motionpicture/kwskfs-api-javascript-client.svg)](https://www.npmjs.com/package/@motionpicture/kwskfs-api-javascript-client)
[![CircleCI](https://circleci.com/gh/motionpicture/kwskfs-api-javascript-client.svg?style=svg)](https://circleci.com/gh/motionpicture/kwskfs-api-javascript-client)
[![Coverage Status](https://coveralls.io/repos/github/motionpicture/kwskfs-api-javascript-client/badge.svg)](https://coveralls.io/github/motionpicture/kwskfs-api-javascript-client)
[![Dependency Status](https://img.shields.io/david/motionpicture/kwskfs-api-javascript-client.svg)](https://david-dm.org/motionpicture/kwskfs-api-javascript-client)
[![Known Vulnerabilities](https://snyk.io/test/github/motionpicture/kwskfs-api-javascript-client/badge.svg)](https://snyk.io/test/github/motionpicture/kwskfs-api-javascript-client)
[![NSP Status](https://nodesecurity.io/orgs/motionpicture/projects/91e22996-2b1b-401e-9647-112fe9323156/badge)](https://nodesecurity.io/orgs/motionpicture/projects/91e22996-2b1b-401e-9647-112fe9323156)
[![npm](https://img.shields.io/npm/dm/@motionpicture/kwskfs-api-javascript-client.svg)](https://nodei.co/npm/@motionpicture/kwskfs-api-javascript-client/)

[Javascript][javascript] client library for using Sasaki APIs. Support for authorization and authentication with OAuth 2.0.

## Table of Contents

* [Installation](#installation)
* [Usage](#usage)
  * [Authorizing and authenticating](#authorizing-and-authenticating)
    * [OAuth2 client](#oauth2-client)
      * [Generating an OAuth2 client](#generating-an-oauth2-client)
      * [Authorize](#authorize)
      * [Setting service-level auth](#setting-service-level-auth)
      * [Manually refreshing access token](#manually-refreshing-access-token)
* [License](#license)

## Installation

This library is distributed on `npm`. In order to add it as a dependency,
run the following command:

``` sh
npm install @motionpicture/kwskfs-api-javascript-client
```

### CommonJS

Include the library in your JavaScript file with

``` js
const sasaki = require("@motionpicture/kwskfs-api-javascript-client");
```

### Browser

Include [lib/browser.js] in your page.

``` html
<script type="text/javascript" src="./node_modules/@motionpicture/kwskfs-api-javascript-client/lib/browser.js"></script>
```

## Usage

Example: Creates a URL Shortener client and retrieves the long url of the
given short url:

``` js
var sasaki = require('@motionpicture/kwskfs-api-javascript-client');
var event = sasaki.service.event({
    endpoint: 'endpoint'.
    auth: auth
});

var conditions = {
    day: '20170817',
    theater: '118'
};

event.url.searchIndividualScreeningEvent({
    searchConditions: conditions
}).then(function (events) {
    console.log('events:', events);
}).catch(function (err) {
    console.error(err);
});
```

### Authorizing and authenticating

#### OAuth2 client

This client comes with an [OAuth2][oauth] client that allows you to retrieve an
access token and refreshes the token and retry the request seamlessly if you
also provide an `expiry_date` and the token is expired.

In the following examples, you may need a `CLIENT_ID`, `REDIRECT_URI` and
`LOGOUT_URI`. You can ask these to the provider.

For more information about OAuth2 and how it works, [see here][oauth].

A complete sample application that authorizes and authenticates with the OAuth2
client is available at [`samples/browser/index.html`].

##### Generating an OAuth2 client

redirect them to a consent page. To redirect them a consent page URL:

``` js
var sasaki = require('@motionpicture/kwskfs-api-javascript-client');

// generate a url that asks permissions for Sasai API scopes
var scopes = [
    'phone', 'openid', 'email', 'aws.cognito.signin.user.admin', 'profile',
    'https://IDENTIFIER/events.read-only'
];

var oauth2Client = new sasaki.auth.Implicit({
    domain: DOMAIN,
    clientId: CLIENT_ID,
    responseType: 'token',
    redirectUri: REDIRECT_URI,
    logoutUri: LOGOUT_URI,
    scope: scopes.join(' '),
    state: '12345'
});

```

##### Authorize

``` js
oauth2Client.authorize().then(function (credentials) {
    console.log('authorize result:', credentials);
}).catch(function (err) {
    console.error(err);
});
```

##### Setting service-level auth

You can set the `auth` as a service-level option.

Example: Setting a service-level `auth` option.

``` js
var sasaki = require('@motionpicture/kwskfs-api-javascript-client');

// generate a url that asks permissions for Sasai API scopes
var scopes = [
    'phone', 'openid', 'email', 'aws.cognito.signin.user.admin', 'profile',
    'https://IDENTIFIER/events.read-only'
];

var oauth2Client = new sasaki.auth.Implicit({
    domain: DOMAIN,
    clientId: CLIENT_ID,
    responseType: 'token',
    redirectUri: REDIRECT_URI,
    logoutUri: LOGOUT_URI,
    scope: scopes.join(' '),
    state: '12345'
});

oauth2Client.authorize().then(function (credentials) {
    console.log('authorize result:', credentials);

    var event = sasaki.service.event({
        endpoint: 'endpoint'.
        auth: oauth2Client
    });

    var conditions = {
        day: '20170817',
        theater: '118'
    };

    event.url.searchIndividualScreeningEvent({
        searchConditions: conditions
    }).then(function (events) {
        console.log('events:', events);
    }).catch(function (err) {
        console.error(err);
    });
}).catch(function (err) {
    console.error(err);
});
```

##### Manually refreshing access token

If you need to manually refresh the `access_token` associated with your OAuth2
client, make sure you have a `refresh_token` set in your credentials first and
then call:

``` js
oauth2Client.refreshToken().then(function (result) {
    console.log('refreshToken result:', result);
}).catch(function (err) {
    console.error(err);
});
```

## License

ISC

[javascript]: https://developer.mozilla.org/ja/docs/Web/JavaScript
[oauth]: https://tools.ietf.org/html/rfc6749