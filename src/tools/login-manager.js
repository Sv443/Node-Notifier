
const { parseEnvFile, writeEnvFile, promptNewLogin } = require("../login");

const dotenv = require("dotenv");
const { Errors, colors, pause } = require("svcorelib");
const prompt = require("prompts");
const { resolve } = require("path");
const open = require("open");

const col = colors.fg;
const { exit } = process;


const paths = Object.freeze({
    notifierDir: resolve("./.notifier"),
    localEnvPath: resolve("./.notifier/.env"),
});

dotenv.config({ path: paths.localEnvPath });


function init()
{
    if(!process.stdin.isTTY)
        throw new Errors.NoStdinError("No TTY stdin channel found");

    return menu();
}

/**
 * Main menu of the login manager
 */
async function menu()
{
    console.clear();

    console.log(`${col.green}Node-Notifier - Password Manager${col.rst}`);
    console.log("Use this tool for changing your login data\n\n");

    const { option } = await prompt({
        type: "select",
        name: "option",
        message: "Choose what to do",
        choices: [
            {
                title: "Set new login",
                value: 0
            },
            {
                title: "Delete current login",
                value: 1
            },
            {
                title: "Open login data file ⧉ ",
                value: 2
            },
            {
                title: "Exit",
                value: 3
            }
        ]
    });

    console.clear();

    switch(option)
    {
    case 0: // set new
        printLines([
            "Setting a new login:",
            "",
            "│ Your new login data will be required to log into Node-Notifier's dashboard or even to send notifications.",
            `│ It will be saved to the hidden file at ${col.yellow}.notifier/.env${col.rst}`,
            "│ Even though the password is saved as a hash, make sure to adequately protect this file and not leak it!",
        ], 1);

        await setNewLogin();
        break;
    case 1: // delete current
        printLines([
            "Deleting your current login:",
            "",
            "│ Your login data is required to log into Node-Notifier's dashboard.",
            "│ If you delete it, you won't be able to access the dashboard anymore until you generate.",
            "│ a new login in the login manager or if Node-Notifier is restarted.",
        ], 1);

        await deleteLogin();
        break;
    case 2: // open path
    {
        const { confirmOpen } = await prompt({
            type: "confirm",
            name: "confirmOpen",
            message: "Opening this file will expose your Node-Notifier username.\nAre you sure you want to continue?",
        });

        if(confirmOpen)
            await open(paths.localEnvPath);

        break;
    }
    default:
    case 3: // exit
        console.log("\nExiting.\n");
        setTimeout(() => exit(0), 250);
        return;
    }

    return menu();
}

/**
 * Prints an array of lines to the console
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
 * Prompts the user to set a new login
 * @returns {Promise<void, Error>}
 */
function setNewLogin()
{
    return new Promise(async (res, rej) => {
        try
        {
            const localEnv = await parseEnvFile();

            const [ user, pass ] = await promptNewLogin();

            if(!user || !pass)
            {
                let to = setTimeout(() => res(), 5000);

                console.log("\n\n");
                console.log(`${col.red}Login data was not provided or is invalid.${col.rst}`);
                await pause("Press any key (or wait 5s) to return to the menu...");

                clearTimeout(to);

                return res();
            }

            localEnv["ADMIN_USER"] = user;
            localEnv["ADMIN_PASS"] = pass;

            process.stdout.write("\n");

            const { saveChar } = await prompt({
                type: "confirm",
                name: "saveChar",
                message: "Do you want to save this new login data?",
                initial: true,
            });

            if(saveChar)
            {
                await writeEnvFile(localEnv);

                console.log(`\n\n\n${col.green}Successfully saved the new login data${col.rst}\n`);

                let to = setTimeout(() => res(), 10000);

                await pause("Press any key (or wait 10s) to return to the menu...");

                clearTimeout(to);
            }

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Couldn't set new password: ${err}`));
        }
    });
}
 
/**
 * Prompts the user to delete the current password
 * @returns {Promise<void, Error>}
 */
function deleteLogin()
{
    return new Promise(async (res, rej) => {
        try
        {
            const { confirmDel } = await prompt({
                type: "confirm",
                name: "confirmDel",
                message: "Are you sure you want to delete your current login data?",
                initial: false
            });

            if(!confirmDel)
            {
                console.clear();
                return menu();
            }

            const localEnv = await parseEnvFile();

            if(localEnv["ADMIN_USER"])
                delete localEnv["ADMIN_USER"];

            if(localEnv["ADMIN_PASS"])
                delete localEnv["ADMIN_PASS"];

            await writeEnvFile(localEnv);

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Couldn't delete password: ${err}`));
        }
    });
}

init();
