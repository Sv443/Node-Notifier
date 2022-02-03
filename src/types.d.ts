import { NotificationMetadata } from "node-notifier";


export { Stringifiable, JSONCompatible } from "svcorelib";


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

/**
 * String tuple array representation of login data.  
 * First item is the username, second item is the hashed password.
 */
export type LoginTuple = [
    username: string,
    password: string,
];

/**
 * Describes a keypress object, as emitted by readline's `keypress` event
 */
export interface KeypressObj {
    /** Whether CTRL was being held */
    ctrl: boolean;
    /** Whether Shift was being held */
    shift: boolean;
    /** Whether Meta / ALT was being held */
    meta: boolean;
    /** The name of this key */
    name: string;
    /** The final sequence of chars / key codes */
    sequence: string;
    /** Key code for special keys */
    code?: string;
}

/**
 * The cache manifest contains all external assets that have been downloaded and cached
 */
export type CacheManifest = CacheEntry[];

/**
 * Represents an asset's entry in the cache manifest
 */
export interface CacheEntry {
    /** Local absolute path */
    path: string;
    /** External URL from where this asset was downloaded */
    url: string;
    /** Hash of the asset as a base64 string */
    hash: string;
    /** Timestamp of when the asset was saved */
    time: number;
}
