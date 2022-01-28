
const { parseEnvFile, writeEnvFile, promptNewLogin } = require("../login");

const dotenv = require("dotenv");
const { Errors, colors } = require("svcorelib");
const prompt = require("prompts");
const { resolve } = require("path");

const col = colors.fg;


dotenv.config({ path: resolve("./.notifier/.env") });

const { exit } = process;


function init()
{
    if(!process.stdin.isTTY)
        throw new Errors.NoStdinError("No TTY stdin channel found");

    return menu();
}

async function menu()
{
    console.clear();

    console.log(`${col.green}Node-Notifier - Password Manager${col.rst}`);
    console.log("Use this tool to change your dashboard password\n\n");

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
                title: "Exit",
                value: 2
            }
        ]
    });

    console.clear();

    switch(option)
    {
    case 0: // set new
        printLines([
            "Setting a new login",
            "Your new login data will be required to log into Node-Notifier's dashboard",
            "It will be saved to the hidden file '.notifier/.env', make sure to adequately protect this file!",
        ], 1);
        console.log();

        await setNewLogin();
        break;
    case 1: // delete current
        printLines([
            "Deleting your current login",
            "Your login data is required to log into Node-Notifier's dashboard",
            "If you delete it, you won't be able to access the dashboard anymore until you generate",
            "a new login in the login manager or if Node-Notifier is restarted",
        ], 1);

        await deleteLogin();
        break;
    default:
    case 2: // exit
        console.log("\nExiting.\n");
        setTimeout(() => exit(0), 500);
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
                throw new Error("No login provided in \"new login\" prompt");

            localEnv["ADMIN_USER"] = user;
            localEnv["ADMIN_PASS"] = pass;

            const { saveChar } = await prompt({
                type: "confirm",
                name: "saveChar",
                message: "Do you want to save these changes?",
                initial: true,
            });

            if(saveChar)
                await writeEnvFile(localEnv);

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
