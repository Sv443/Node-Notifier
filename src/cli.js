const readline = require("readline");
const kleur = require("kleur");
const NanoTimer = require("nanotimer");


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
    process.stdout.write(kleur.underline().green(`${title}\n`));

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

module.exports = {
    printTitle,
    printLines,
    pause,
    pauseFor,
    pauseForMicroS,
};
