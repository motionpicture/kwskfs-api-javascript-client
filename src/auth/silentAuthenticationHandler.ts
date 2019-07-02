import * as ErrorFactory from './error';
import IframeHandler from './iframeHandler';

export interface IOptions {
    authenticationUrl: string;
    timeout?: number;
}

/**
 * SilentAuthenticationHandler
 */
export default class SilentAuthenticationHandler {
    public authenticationUrl: string;
    public timeout: number;
    public handler: any;

    constructor(options: IOptions) {
        this.authenticationUrl = options.authenticationUrl;
        // tslint:disable-next-line:no-magic-numbers
        this.timeout = (options.timeout !== undefined) ? options.timeout : 60 * 1000;
        this.handler = null;
    }

    public static GET_EVENT_VALIDATOR() {
        return {
        };
    }

    public static GET_CALLBACK_HANDLER(cb: (hash: any) => void, usePostMessage: boolean) {
        return (eventData: any) => {
            let callbackValue;

            try {
                if (!usePostMessage) {
                    // loadイベントの場合は、iframeウィンドウのフラグメントをコールバックへ渡す
                    callbackValue = eventData.sourceObject.contentWindow.location.hash;
                } else if (typeof eventData.event.data === 'object' && eventData.event.data.hash) {
                    callbackValue = eventData.event.data.hash;
                } else {
                    callbackValue = eventData.event.data;
                }

            } catch (error) {
                console.error('SilentAuthenticationHandler.GET_CALLBACK_HANDLER:', error);
            }

            cb(callbackValue);
        };
    }

    public static CREATE(options: IOptions) {
        return new SilentAuthenticationHandler(options);
    }

    public async login(usePostMessage: boolean) {
        return new Promise<(hash: any) => void>((resolve, reject) => {
            this.handler = new IframeHandler({
                url: this.authenticationUrl,
                eventListenerType: usePostMessage ? 'message' : 'load',
                callback: SilentAuthenticationHandler.GET_CALLBACK_HANDLER(resolve, usePostMessage),
                timeout: this.timeout,
                eventValidator: SilentAuthenticationHandler.GET_EVENT_VALIDATOR(),
                timeoutCallback: () => {
                    const err = new ErrorFactory.AuthorizeError('Timeout during authentication renew');
                    err.error = 'timeout';
                    err.errorDescription = 'Timeout during authentication renew';
                    reject(err);
                },
                usePostMessage: usePostMessage || false
            });

            this.handler.init();
        });
    }
}
