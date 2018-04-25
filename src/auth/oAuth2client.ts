import * as createDebug from 'debug';
import * as httpStatus from 'http-status';
import * as fetch from 'isomorphic-fetch';

import { Auth, transporters } from '@motionpicture/kwskfs-api-abstract-client';
import ICredentials from './credentials';

const debug = createDebug('kwskfs-api:auth:oAuth2client');

export interface IOptions {
    domain: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    logoutUri?: string;
    responseType?: string;
    responseMode?: string;
    scopes?: string[];
    state: string;
    nonce?: string | null;
    audience?: string;
    tokenIssuer?: string;
}

/**
 * OAuth2 client
 */
export default class OAuth2client implements Auth {
    public credentials: ICredentials;
    public options: IOptions;

    constructor(options: IOptions) {
        this.options = options;
        this.credentials = {};
    }

    /**
     * OAuthクライアントに認証情報をセットします。
     */
    public setCredentials(credentials: ICredentials) {
        this.credentials = credentials;
    }

    public async refreshAccessToken(): Promise<ICredentials> {
        if (this.credentials.refreshToken === undefined) {
            throw new Error('No refresh token is set.');
        }

        return this.refreshToken(this.credentials.refreshToken)
            .then((tokens) => {
                debug('setting credentials...', tokens);
                this.credentials = tokens;

                return this.credentials;
            });
    }

    /**
     * 期限の切れていないアクセストークンを取得します。
     * 必要であれば更新してから取得します。
     */
    public async getAccessToken(): Promise<string> {
        // tslint:disable-next-line:max-line-length
        // return 'eyJraWQiOiJ0U3dFVmJTa0IzZzlVY01YajBpOWpISGRXRk9FamsxQUNKOHZrZ3VhV0lzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhOTZhNzZhZi04YmZhLTQwMmUtYmEzMC1kYmYxNDk0NmU0M2QiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6ImF3cy5jb2duaXRvLnNpZ25pbi51c2VyLmFkbWluIHBob25lIG9wZW5pZCBwcm9maWxlIGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL3BsYWNlcy5yZWFkLW9ubHkgZW1haWwiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtbm9ydGhlYXN0LTEuYW1hem9uYXdzLmNvbVwvYXAtbm9ydGhlYXN0LTFfelRoaTBqMWZlIiwiZXhwIjoxNTAyODQ2MzMwLCJpYXQiOjE1MDI4NDI3MzAsInZlcnNpb24iOjIsImp0aSI6ImJlMTgyMWQ1LTZkZDktNDQ5Ny04NjczLWQ2Y2E1N2RiZDFlMSIsImNsaWVudF9pZCI6IjZmaWd1bjEyZ2NkdGxqOWU1M3AydTNvcXZsIiwidXNlcm5hbWUiOiJpbG92ZWdhZGRAZ21haWwuY29tIn0.PmlJaBrrgt8s7LM9y38LeY7PBHLqGYXESfAG3MpvXQWyH6lmFuiOxDGgpRrbue9Zuk_Hw0mfBuIh7-cIhVVZaUSlGIL7J7Pk-vlWi2OT8pJDwyJWJNk6sQ8LH3pTD93H4jxo6V9FArk7ovX0ytE4bO4WlDa5FOCtamh0ryRrgw9q8bI3KP-qvfSVoqQK1RqvnGDTH91Apnrhur_-mT0PYcNgCiWCg6wWb-LZSReyHtuHnmN16MRSx43KPu4pl2F8TPvQVW13MVfhfNFRSYWcKAV1JVDVPjqjiLE4FyDJj93DAaZzYvwDTA6TJcRZ18teRPL4kLB_OamdFT6RD1XbcA';
        const expiryDate = this.credentials.expiryDate;

        // if no expiry time, assume it's not expired
        const isTokenExpired = (expiryDate !== undefined) ? (expiryDate <= (new Date()).getTime()) : false;

        if (this.credentials.accessToken === undefined && this.credentials.refreshToken === undefined) {
            throw new Error('No access or refresh token is set.');
        }

        const shouldRefresh = (this.credentials.accessToken === undefined) || isTokenExpired;
        if (shouldRefresh && this.credentials.refreshToken !== undefined) {
            const tokens = await this.refreshAccessToken();

            return <string>tokens.accessToken;
        } else {
            return <string>this.credentials.accessToken;
        }
    }

    /**
     * Provides a request implementation with OAuth 2.0 flow.
     * If credentials have a refresh_token, in cases of HTTP
     * 401 and 403 responses, it automatically asks for a new
     * access token and replays the unsuccessful request.
     * @param options Request options.
     */
    public async fetch(url: string, options: RequestInit, expectedStatusCodes: number[]) {
        // Callbacks will close over this to ensure that we only retry once
        // let retry = true;

        // Hook the callback routine to call the _postRequest method.
        // const postRequestCb =
        //     (err: Error, body: any, resp: request.RequestResponse) => {
        //         const statusCode = resp && resp.statusCode;
        //         // Automatically retry 401 and 403 responses
        //         // if err is set and is unrelated to response
        //         // then getting credentials failed, and retrying won't help
        //         if (retry && (statusCode === 401 || statusCode === 403) &&
        //             (!err || (err as RequestError).code === statusCode)) {
        //             /* It only makes sense to retry once, because the retry is intended
        //              * to handle expiration-related failures. If refreshing the token
        //              * does not fix the failure, then refreshing again probably won't
        //              * help */
        //             retry = false;
        //             // Force token refresh
        //             this.refreshAccessToken(() => {
        //                 this.getRequestMetadata(unusedUri, authCb);
        //             });
        //         } else {
        //             this.postRequest(err, body, resp, callback);
        //         }
        //     };

        const accessToken = await this.getAccessToken();
        options.headers = (options.headers === undefined || options.headers === null) ? {} : options.headers;
        (<any>options.headers).Authorization = `Bearer ${accessToken}`;

        return this.makeRequest(url, options, expectedStatusCodes);
    }

    /**
     * Refreshes the access token.
     */
    protected async refreshToken(refreshToken: string): Promise<ICredentials> {
        // request for new token
        debug('refreshing access token...');

        const formData = new FormData();
        formData.set('refresh_token', refreshToken);
        formData.set('client_id', <string>this.options.clientId);
        formData.set('client_secret', <string>this.options.clientSecret);
        formData.set('grant_type', 'refresh_token');
        const options = {
            method: 'POST',
            body: formData
        };

        return fetch(`https://${this.options.domain}/token`, options)
            .then(async (response) => {
                if (response.status !== httpStatus.OK) {
                    const body = await response.json();
                    if (typeof body === 'object' && body.errors !== undefined) {
                        const err = new transporters.RequestError(
                            (<any[]>body.errors).map((error) => `${error.title}:${error.detail}`).join('\n')
                        );
                        err.code = response.status;
                        err.errors = body.errors;
                    }

                    throw new Error('An unexpected error occurred');
                }

                const tokens = await response.json();
                if (tokens && tokens.expires_in) {
                    // tslint:disable-next-line:no-magic-numbers
                    tokens.expiry_date = ((new Date()).getTime() + (tokens.expires_in * 1000));
                    delete tokens.expires_in;
                }

                return tokens;
            });
    }

    /**
     * Makes a request without paying attention to refreshing or anything
     * Assumes that all credentials are set correctly.
     * @param opts Options for request
     * @param callback callback function
     * @return The request object created
     */
    // tslint:disable-next-line:prefer-function-over-method
    private async makeRequest(url: string, options: RequestInit, expectedStatusCodes: number[]) {
        const transporter = new transporters.DefaultTransporter(expectedStatusCodes);

        return transporter.fetch(url, options);
    }
}
