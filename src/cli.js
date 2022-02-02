const readline = require("readline");

const { colors } = require("svcorelib");

const col = colors.fg;


/** @typedef {import("./types").KeypressObj} KeypressObj */


// I really hope this doesn't break something
readline.emitKeypressEvents(process.stdin);


/**
 * Prints a title and optionally subtitle
 * @param {string} title
 * @param {string} [subtitle]
 */
function printTitle(title, subtitle)
{
    process.stdout.write(`${col.green}Node-Notifier - ${title}${col.rst}\n`);

    if(subtitle)
        process.stdout.write(`${subtitle}\n\n\n`);
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

// /**
//  * Pauses the stdin stream until the user presses any key
//  * @param {Stringifiable} message Message to display - 1 whitespace is added at the end automatically
//  * @returns {Promise<number>} Resolves with key code - resolves -1 if there was an error extracting the key code
//  */
// function pause(message)
// {
//     process.stdout.write(`${message.toString()} `);

//     return new Promise(res => {
//         process.stdin.setRawMode(true);
//         process.stdin.resume();
//         process.stdin.on("keypress", (key, ch) => {
//             process.stdin.pause();
//             process.stdin.setRawMode(false);
//             process.stdout.write("\n");
//             try
//             {
//                 return res(parseInt(key[0]));
//             }
//             catch(err)
//             {
//                 return res(-1);
//             }
//         });
//     });
// }

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

module.exports = {
    printTitle,
    printLines,
    pause,
};
