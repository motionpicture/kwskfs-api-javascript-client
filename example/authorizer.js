const fs = require("fs-extra");
const jwt = require("jsonwebtoken");
const jwkToPem = require('jwk-to-pem');
const readline = require("readline");
const fetch = require("isomorphic-fetch");

// export interface IOpenIdConfiguration {
//     issuer: string;
//     authorization_endpoint: string;
//     token_endpoint: string;
//     jwks_uri: string;
//     response_types_supported: string[];
//     subject_types_supported: string[];
//     version: string;
//     id_token_signing_alg_values_supported: string[];
//     x509_url: string;
// }

// export interface IPems {
//     [key: string]: string;
// }

// export interface IJwk {
//     kty: string;
//     alg: string;
//     use: string;
//     kid: string;
//     n: string;
//     e: string;
// }

// export type IPayload = any;

// tslint:disable-next-line:max-line-length
// const ISSUER = 'https://cognito-identity.amazonaws.com';
const ISSUER = process.env.TEST_ISSUER;
const permittedAudiences = [
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('トークンを入力してください\n', async (token) => {
    try {
        const pemsFromJson = require('./pems.json');
        validateToken(pemsFromJson, token, permittedAudiences).then((payload) => {
            console.log('verified! payload:', payload);
            process.exit(0);
        });

        // createPems().then((pems) => {
        //     validateToken(pems, token, permittedAudiences).then((payload) => {
        //         console.log('verified! payload:', payload);
        //         process.exit(0);
        //     });
        // });
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
});

function createPems() {
    return fetch(
        `${ISSUER}/.well-known/openid-configuration`
    ).then((response) => {
        return response.json().then((openidConfiguration) => {
            return fetch(openidConfiguration.jwks_uri).then((response) => {
                return response.json().then((body) => {
                    console.log('got jwks_uri', body);
                    const pemsByKid = {};
                    body['keys'].forEach((key) => {
                        pemsByKid[key.kid] = jwkToPem(key);
                    });

                    fs.writeFileSync(`${__dirname}/pems.json`, JSON.stringify(pemsByKid));

                    return pemsByKid;
                });
            });
        });
    });
}

function validateToken(pems, token, pemittedAudiences) {
    console.log('validating token...');
    const decodedJwt = jwt.decode(token, { complete: true });
    if (!decodedJwt) {
        throw new Error('invalid JWT token');
    }
    console.log('decodedJwt:', decodedJwt);

    // if (decodedJwt.payload.aud !== AUDIENCE) {
    //     throw new Error('invalid audience');
    // }

    // Get the kid from the token and retrieve corresponding PEM
    const pem = pems[decodedJwt.header.kid];
    if (!pem) {
        throw new Error(`corresponding pem undefined. kid:${decodedJwt.header.kid}`);
    }

    return new Promise((resolve, reject) => {
        // Verify the signature of the JWT token to ensure it's really coming from your User Pool
        jwt.verify(token, pem, {
            issuer: ISSUER,
            audience: pemittedAudiences
        }, (err, payload) => {
            if (err) {
                reject(err);
            } else {
                // sub is UUID for a user which is never reassigned to another user.
                resolve(payload);
            }
        });
    });
}
