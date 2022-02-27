const readline = require("readline");
const k = require("kleur");
const NanoTimer = require("nanotimer");
const { spawn } = require("child_process");
const { allOfType } = require("svcorelib");

const { CommandError } = require("./error");


/** @typedef {import("./types").KeypressObj} KeypressObj */


// I really hope this doesn't break something
readline.emitKeypressEvents(process.stdin);


/**
 * Prints a title and optionally subtitle
 * @param {string} title
 * @param {string|string[]} [subtitle]
 */
function printTitle(title, subtitle)
{
    process.stdout.write(k.underline().green(`${title}\n`));

    if(subtitle)
    {
        if(Array.isArray(subtitle))
            subtitle = subtitle.join("\n");

        process.stdout.write(`${subtitle}\n\n\n`);
    }
    else
        process.stdout.write("\n\n");
}

/**
 * Prints an array of lines to the console all at once to minimize jitter
 * @param {string[]} lines
 * @param {number} [extraNewlines]
 */
function printLines(lines, extraNewlines = 0)
{
    if(typeof extraNewlines != "number" || extraNewlines < 0)
        extraNewlines = 0;

    let finalNLs = "\n";

    for(let i = 0; i < extraNewlines; i++)
        finalNLs += "\n";

    process.stdout.write(`${lines.join("\n")}${finalNLs}`);
}

/**
 * Pauses the stdin stream until the user presses any key
 * @param {Stringifiable} message Message to display - 1 whitespace is added at the end automatically
 * @returns {Promise<KeypressObj>}
 */
function pause(message)
{
    process.stdout.write(`${message.toString()} `);

    const wasRaw = process.stdin.isRaw;

    return new Promise(res => {
        const onKeypress = (ch, key) => {
            process.stdin.pause();
            !wasRaw && process.stdin.setRawMode(false);

            process.stdin.removeListener("keypress", onKeypress);
            process.stdout.write("\n");

            return res(key);
        };

        !wasRaw && process.stdin.setRawMode(true);
        process.stdin.resume();

        process.stdin.on("keypress", onKeypress);
    });
}

/**
 * Pauses for the given `time` in **milliseconds**, then resolves the returned promise
 * @param {number} time
 * @returns {Promise<void>}
 */
function pauseFor(time)
{
    time = parseFloat(time);

    if(isNaN(time) || time < 0)
        throw new TypeError("Provided time is not a number or lower than 0");

    return new Promise((res) => {
        setTimeout(() => res(), time);
    });
}

/**
 * Pauses for the given `time` in **microseconds**, then resolves the returned promise
 * @param {number} time
 * @returns {Promise<void>}
 */
function pauseForMicroS(time)
{
    return new Promise(res => {
        const nt = new NanoTimer();

        nt.setTimeout(res, "", `${time}u`);
    });
}

/**
 * Censors the `str` by replacing all chars with `*` after skipping `shownCharsAmt` characters
 * @param {string} str
 * @param {number} [shownCharsAmt=3]
 * @returns {string}
 */
function censor(str, shownCharsAmt)
{
    shownCharsAmt = parseInt(shownCharsAmt);
    if(isNaN(shownCharsAmt) || shownCharsAmt < 0)
        shownCharsAmt = 3;

    // needs full censor since string is so short
    if(str.length <= shownCharsAmt)
    {
        let fullCensor = "";

        for(let i = 0; i < str.length; i++)
            fullCensor += "*";

        return fullCensor;
    }

    /** Replacement chars */
    let repl = "";

    for(let i = 0; i < str.length - shownCharsAmt; i++)
        repl += "*";

    return `${str.substring(0, shownCharsAmt)}${repl}`;
}

/**
 * Runs a shell command. Resolves void if exit code = 0, else rejects with an error or the exit code.
 * @param {string} command The command to run
 * @param {string[]} [args] The arguments
 * @param {string} [cwd] The current working directory of this command - defaults to `process.cwd()`
 * @param {(msg: string) => void} [onMessage] Gets called whenever the command sends a line to its stdout
 * @returns {Promise<void, (Error | number)>}
 */
function runCommand(command, args, cwd, onMessage)
{
    if(!Array.isArray(args) || !allOfType(args, "string"))
        args = [];

    if(!["string", "undefined"].includes(typeof cwd))
        cwd = process.cwd();

    if(typeof onMessage !== "function")
        onMessage = () => {};

    return new Promise(async (res, rej) => {
        try
        {
            /** @type {import("child_process").SpawnOptionsWithoutStdio} */
            const cpOpts = {
                ...(cwd ? { cwd } : {}),
                windowsHide: true,
            };

            const cp = spawn(command, args, cpOpts);

            cp.on("error", err => {
                console.error(k.red("Command failed due to error:\n"), err);
                return rej(err);
            });

            cp.stdout.on("data", async chunk => {
                const msg = String(chunk);

                onMessage(msg);

                if(msg.includes("(Y/N)") || msg.includes("To fix this automatically"))
                {
                    setImmediate(() => {
                        cp.stdin.setEncoding("utf-8");
                        cp.stdin.write("Y\n");
                        cp.stdin.end();
                    });
                }
            });

            cp.on("exit", (code) => {
                if(code === 0)
                    return res();

                return rej(typeof code === "number" ? new CommandError(`Command '${command}' exited with code ${code}`) : code);
            });
        }
        catch(err)
        {
            return rej(err);
        }
    });
}

module.exports = {
    printTitle,
    printLines,
    pause,
    pauseFor,
    pauseForMicroS,
    censor,
    runCommand,
};
