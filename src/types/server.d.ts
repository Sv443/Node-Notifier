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

/**
 * Expected HTTP request body
 */
export interface RequestBody {
    /** Short title / notification summary */
    title: string;
    /** Longer message / notification description */
    message: string;
    /** Square icon added to the notification */
    icon?: string;
    /** An array of actions the user can click */
    actions?: string[];
    /** Timeout in seconds after which the notification will time out */
    timeout?: number;
}
