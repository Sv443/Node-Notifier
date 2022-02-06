/**
 * Describes query parameters sent by a client
 */
export interface QueryObj
{
    /** Whether the server should wait for a user response before the request is responded to */
    waitForResult: boolean;
}


/**
 * HTTP methods supported by Node-Notifier (excluding preflight like HEAD & OPTIONS)
 */
export type HttpMethod = "GET" | "POST";
