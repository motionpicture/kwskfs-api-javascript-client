import * as ErrorFactory from './error';
import IframeHandler from './iframeHandler';

export interface IOptions {
    logoutUrl: string;
    timeout?: number;
}

/**
 * SilentLogoutHandler
 */
export default class SilentLogoutHandler {
    public logoutUrl: string;
    public timeout: number;
    public handler: any;

    constructor(options: IOptions) {
        this.logoutUrl = options.logoutUrl;
        // tslint:disable-next-line:no-magic-numbers
        this.timeout = (options.timeout !== undefined) ? options.timeout : 60 * 1000;
        this.handler = null;
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
                console.error('SilentLogoutHandler.GET_CALLBACK_HANDLER:', error);
            }

            cb(callbackValue);
        };
    }

    public static CREATE(options: IOptions) {
        return new SilentLogoutHandler(options);
    }

    public static GET_EVENT_VALIDATOR() {
        return {
        };
    }

    public async logout(usePostMessage: boolean) {
        return new Promise<void>((resolve, reject) => {
            this.handler = new IframeHandler({
                url: this.logoutUrl,
                eventListenerType: usePostMessage ? 'message' : 'load',
                callback: SilentLogoutHandler.GET_CALLBACK_HANDLER(resolve, usePostMessage),
                timeout: this.timeout,
                eventValidator: SilentLogoutHandler.GET_EVENT_VALIDATOR(),
                timeoutCallback: () => {
                    const err = new ErrorFactory.AuthorizeError('Timeout during logout');
                    err.error = 'timeout';
                    err.errorDescription = 'Timeout during logout';
                    reject(err);
                },
                usePostMessage: usePostMessage || false
            });

            this.handler.init();
        });
    }
}
