/**
 * Sasaki API client for javascript
 *
 * @ignore
 */

import * as sasaki from '@motionpicture/kwskfs-api-abstract-client';

import { ImplicitGrantClient, IOptions as IImplicitGrantClientOptions } from './auth/implicitGrantClient';

/**
 * factory
 * All object interfaces are here.
 * 全てのオブジェクトのインターフェースはここに含まれます。
 * @export
 */
export import factory = sasaki.factory;

export import service = sasaki.service;
export import transporters = sasaki.transporters;

export type IImplicitGrantClient = ImplicitGrantClient;

/**
 * create OAuth2 client instance using implicit grant
 * @param options implicit grant configurations
 */
export function createAuthInstance(options: IImplicitGrantClientOptions) {
    return new ImplicitGrantClient(options);
}
