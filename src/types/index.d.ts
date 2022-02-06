export { Stringifiable, JSONCompatible } from "svcorelib";


/**
 * The type of startup used in ./Node-Notifier.js
 */
export type StartupType = "new" | "restart" | "stopped" | "idle";

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


export * from "./auth";
export * from "./cache";
export * from "./config";
export * from "./notifications";
export * from "./server";
