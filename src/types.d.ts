/**
 * Describes query parameters sent by a client
 */
export interface QueryObj
{
    /** Whether the server should wait for a user response before the request is responded to */
    waitForResult: boolean = false;
}

/**
 * HTTP methods supported by Node-Notifier
 */
export type HttpMethod = "GET" | "POST";
