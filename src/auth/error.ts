/**
 * authorize error
 */
export class AuthorizeError extends Error {
    public error: string;
    public errorDescription: string;
    public state: string;
}
