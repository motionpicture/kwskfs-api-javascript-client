import * as ErrorFactory from './error';
import PopupHandler from './popupHandler';

export interface IOptions {
    authenticationUrl: string;
    timeout?: number;
}

/**
 * PopupAuthenticationHandler
 */
export default class PopupAuthenticationHandler {
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
                    // loadイベントの場合は、ポップアップのフラグメントをコールバックへ渡す
                    callbackValue = eventData.sourceObject.location.hash;
                } else if (typeof eventData.event.data === 'object' && eventData.event.data.hash) {
                    callbackValue = eventData.event.data.hash;
                } else {
                    callbackValue = eventData.event.data;
                }

            } catch (error) {
                console.error('PopupAuthenticationHandler.GET_CALLBACK_HANDLER:', error);
            }

            cb(callbackValue);
        };
    }

    public static CREATE(options: IOptions) {
        return new PopupAuthenticationHandler(options);
    }

    public async login(usePostMessage: boolean) {
        return new Promise<(hash: any) => void>((resolve, reject) => {
            this.handler = new PopupHandler({
                url: this.authenticationUrl,
                eventListenerType: usePostMessage ? 'message' : 'load',
                callback: PopupAuthenticationHandler.GET_CALLBACK_HANDLER(resolve, usePostMessage),
                timeout: this.timeout,
                eventValidator: PopupAuthenticationHandler.GET_EVENT_VALIDATOR(),
                timeoutCallback: () => {
                    const err = new ErrorFactory.AuthorizeError('Timeout during authentication');
                    err.error = 'timeout';
                    err.errorDescription = 'Timeout during authentication';
                    reject(err);
                },
                usePostMessage: false
            });

            this.handler.init();
        });
    }
}
