import { NotificationMetadata } from "node-notifier";



/**
 * Describes query parameters sent by a client
 */
export interface QueryObj
{
    /** Whether the server should wait for a user response before the request is responded to */
    waitForResult: boolean;
}


/**
 * HTTP methods supported by Node-Notifier
 */
export type HttpMethod = "GET" | "POST";


/**
 * The result of sending a desktop notification
 */
export interface NotificationResult
{
    /** Result string */
    result: string;
    /** Notification metadata object */
    meta: NotificationMetadata;
}

/**
 * The object that gets saved to the notifications log
 */
export interface LogNotificationObj
{
    /** Notification title */
    title: string | null;
    /** Notification message / body */
    message: string | null;
    /** Notification icon path */
    icon: string | null;
    /** Actions the user can choose from */
    actions: string[] | null;
    /** Whether the server waited for a user response before the request was responded to */
    wait: boolean | null;
    /** 13-character UNIX timestamp */
    timestamp: number;
}

/**
 * The type of startup used in ./Node-Notifier.js
 */
export type StartupType = "new" | "restart" | "stopped" | "idle";
