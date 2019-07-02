import * as createDebug from 'debug';
import * as qs from 'qs';

import * as  ErrorFactory from './error';
import PopupAuthenticationHandler from './popupAuthenticationHandler';
import SilentAuthenticationHandler from './silentAuthenticationHandler';
import SilentLogoutHandler from './silentLogoutHandler';
// tslint:disable-next-line:no-require-imports no-var-requires
const idTokenVerifier = require('idtoken-verifier');

import ICredentials from './credentials';
import OAuth2client from './oAuth2client';

const debug = createDebug('kwskfs-api:auth:implicitGrantClient');

export interface IOptions {
    domain: string;
    clientId: string;
    redirectUri: string;
    logoutUri: string;
    responseType: string;
    responseMode?: string;
    scope: string;
    state: string;
    nonce: string | null;
    audience?: string;
    tokenIssuer: string;
}

/**
 * OAuth2 client using grant type 'implicit grant'
 */
export class ImplicitGrantClient extends OAuth2client {
    public static AUTHORIZE_URL: string = '/authorize';
    public static LOGOUT_URL: string = '/logout';

    public options: IOptions;
    public credentials: ICredentials;

    constructor(options: IOptions) {
        // assert.check(
        //     options,
        //     { type: 'object', message: 'options parameter is not valid' },
        //     {
        //         domain: { type: 'string', message: 'domain option is required' },
        //         clientId: { type: 'string', message: 'clientId option is required' },
        //         responseType: { optional: true, type: 'string', message: 'responseType is not valid' },
        //         responseMode: { optional: true, type: 'string', message: 'responseMode is not valid' },
        //         redirectUri: { optional: true, type: 'string', message: 'redirectUri is not valid' },
        //         scope: { optional: true, type: 'string', message: 'scope is not valid' },
        //         audience: { optional: true, type: 'string', message: 'audience is not valid' }
        //     }
        // );

        super(options);

        this.options = options;
        this.options.responseMode = 'fragment';
        this.options.responseType = 'token';
        // amazon cognitoの認可サーバーはnonce未実装
        this.options.nonce = null;
        debug('options:', this.options);

        this.credentials = {};
    }

    public static BUILD_PASRSE_HASH_RESPONS(qsParams: any, __: string, idTokenPayload: any): ICredentials {
        return {
            accessToken: qsParams.access_token,
            idToken: qsParams.id_token,
            idTokenPayload: idTokenPayload,
            refreshToken: qsParams.refresh_token,
            state: qsParams.state,
            // tslint:disable-next-line:no-magic-numbers
            expiresIn: qsParams.expires_in ? parseInt(qsParams.expires_in, 10) : undefined,
            tokenType: qsParams.token_type
        };
    }

    public async isSignedIn() {
        return this.refreshToken()
            .then((result) => result)
            .catch(() => null);
    }

    public async getAccessToken(): Promise<string> {
        // todo check if expired

        if (this.credentials.accessToken === undefined) {
            await this.refreshAccessToken();
        }

        return <string>this.credentials.accessToken;
    }

    public async refreshAccessToken(): Promise<ICredentials> {
        if (this.credentials.refreshToken === undefined) {
            throw new Error('not authorized yet');
        }

        return this.refreshToken();
    }

    /**
     * Executes a silent authentication transaction under the hood in order to fetch a new tokens for the current session.
     */
    public async refreshToken() {
        const usePostMessage = false;
        const params = {
            clientId: this.options.clientId,
            responseType: this.options.responseType,
            responseMode: this.options.responseMode,
            prompt: 'none',
            redirectUri: this.options.redirectUri,
            scope: this.options.scope,
            state: this.options.state,
            nonce: this.options.nonce
        };

        const handler = SilentAuthenticationHandler.CREATE({
            authenticationUrl: this.buildAuthorizeUrl(params)
        });

        const hash = await handler.login(usePostMessage);

        return this.onLogin(hash);
    }

    /**
     * Redirects to the hosted login page (`/authorize`) in order to start a new authN/authZ transaction.
     */
    public async signIn() {
        const usePostMessage = true;
        const params = {
            clientId: this.options.clientId,
            responseType: this.options.responseType,
            responseMode: this.options.responseMode,
            prompt: '',
            redirectUri: this.options.redirectUri,
            scope: this.options.scope,
            state: this.options.state,
            nonce: this.options.nonce
        };

        const handler = PopupAuthenticationHandler.CREATE({
            authenticationUrl: this.buildAuthorizeUrl(params)
        });

        // 認可画面を新規タブで開く
        const hash = await handler.login(usePostMessage);

        return this.onLogin(hash);
    }

    /**
     * Redirects to the auth0 logout endpoint
     */
    public async signOut() {
        const usePostMessage = false;
        const handler = SilentLogoutHandler.CREATE({
            logoutUrl: this.buildLogoutUrl({
                clientId: this.options.clientId,
                logoutUri: this.options.logoutUri
            })
        });

        await handler.logout(usePostMessage);
    }

    private async onLogin(hash: any): Promise<ICredentials> {
        debug('onLogin');
        // hash was already parsed, so we just return it.
        this.credentials = (typeof hash === 'object') ? hash : await this.parseHash(hash);
        debug('credentials:', this.credentials);

        return this.credentials;
    }

    private async parseHash(hash?: string) {
        let hashStr = hash === undefined ? window.location.hash : hash;
        hashStr = hashStr.replace(/^#?\/?/, '');

        const parsedQs = qs.parse(hashStr);

        // if authorization falied
        if (parsedQs.hasOwnProperty('error')) {
            const err = new ErrorFactory.AuthorizeError(parsedQs.error_description);
            err.error = parsedQs.error;
            err.errorDescription = parsedQs.error_description;
            err.state = parsedQs.state;

            throw err;
        }

        if (
            !parsedQs.hasOwnProperty('access_token') &&
            !parsedQs.hasOwnProperty('id_token') &&
            !parsedQs.hasOwnProperty('refresh_token')
        ) {
            throw new Error('invalid hash');
        }

        // id_tokenを検証する
        if (parsedQs.id_token) {
            const payload = await this.validateToken(parsedQs.id_token, this.options.nonce);

            return ImplicitGrantClient.BUILD_PASRSE_HASH_RESPONS(parsedQs, '', payload);
        }

        if (parsedQs.id_token) {
            const verifier = new idTokenVerifier({
                issuer: this.options.tokenIssuer,
                audience: this.options.clientId
            });
            const decodedToken = verifier.decode(parsedQs.id_token);

            return ImplicitGrantClient.BUILD_PASRSE_HASH_RESPONS(parsedQs, '', decodedToken.payload);
        } else {
            return ImplicitGrantClient.BUILD_PASRSE_HASH_RESPONS(parsedQs, '', null);
        }
    }

    /**
     * Decodes the a JWT and verifies its nonce value
     */
    private async validateToken(token: string, nonce: string | null): Promise<any> {
        debug('validating id_token...');

        return new Promise<any>((resolve, reject) => {
            const verifier = new idTokenVerifier({
                issuer: this.options.tokenIssuer,
                audience: this.options.clientId
            });

            verifier.verify(token, nonce, (err: any, payload: any) => {
                debug('id_token verified', err, payload);
                if (err !== null) {
                    reject(err);

                    return;
                }

                resolve(payload);
            });
        });
    }

    private buildAuthorizeUrl(options: any) {
        const qString = qs.stringify({
            client_id: options.clientId,
            response_type: options.responseType,
            redirect_uri: options.redirectUri,
            response_mode: options.responseMode,
            scope: options.scope,
            state: options.state,
            nonce: options.nonce,
            prompt: options.prompt
        });

        return `https://${this.options.domain}${ImplicitGrantClient.AUTHORIZE_URL}?${qString}`;
    }

    /**
     * Builds and returns the Logout url in order to initialize a new authN/authZ transaction
     * If you want to navigate the user to a specific URL after the logout,
     * set that URL at the returnTo parameter. The URL should be included in any the appropriate Allowed Logout URLs list:
     */
    private buildLogoutUrl(options: any) {
        const qString = qs.stringify({
            client_id: options.clientId,
            logout_uri: options.logoutUri
        });

        return `https://${this.options.domain}${ImplicitGrantClient.LOGOUT_URL}?${qString}`;
    }
}
