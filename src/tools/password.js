// TODO: write tool to manage password

const dotenv = require("dotenv");
const { readFile, writeFile } = require("fs-extra");
const { filesystem, allOfType, isArrayEmpty, isEmpty, Errors, colors } = require("svcorelib");
const prompt = require("prompts");

const col = colors.fg;


dotenv.config();

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

    // TODO:
    switch(option)
    {
        case 0: // set new
            console.log("Setting a new login");
            console.log("Your new login data will be required to log into Node-Notifier's dashboard");
            console.log("It will be saved to the hidden file '.env', make sure to adequately protect this file!");
            console.log();

            await setNewLogin();
        break;
        case 1: // delete current
            console.log("Deleting your current login");
            console.log("Your login data is required to log into Node-Notifier's dashboard");
            console.log("If you delete it, you won't be able to access the dashboard anymore until you generate new login data");
            console.log();
            await deleteLogin();
        break;
        default:
        case 2: // exit
            return exit(0);
    }

    return menu();
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

            localEnv["DASHBOARD_USER"] = user;
            localEnv["DASHBOARD_PASS"] = pass;

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
            return rej(new Error(`Error while setting new password: ${err}`))
        }
    });
}

/**
 * Prompts the user to input new login data
 * @returns {string[]} First item is username, second item is unhashed password
 */
function promptNewLogin()
{
    return new Promise(async (res, rej) => {
        try
        {
            const validate = (val) => !isEmpty(val);

            const { user } = await prompt({
                type: "text",
                name: "user",
                message: "Set your username",
                validate
            });

            const { pass } = await prompt({
                type: "password",
                name: "pass",
                message: "Set your password",
                validate
            });

            if(!allOfType([ user, pass ], "string") || isArrayEmpty([ user, pass ]))
            {
                console.log("\nUsername or password aren't valid");

                const { tryAgain } = await prompt({
                    type: "confirm",
                    name: "tryAgain",
                    message: "Do you want to enter them again?"
                });

                if(tryAgain)
                {
                    console.clear();

                    return res(await promptNewLogin());
                }
                else
                    return menu();
            }

            return res([ user, pass ]);
        }
        catch(err)
        {
            return rej(new Error(`Error while prompting for a new login: ${err}`))
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

            if(localEnv["DASHBOARD_USER"])
                delete localEnv["DASHBOARD_USER"];

            if(localEnv["DASHBOARD_PASS"])
                delete localEnv["DASHBOARD_PASS"];

            await writeEnvFile(localEnv);

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Error while deleting password: ${err}`))
        }
    });
}

/**
 * Reads and parses the env file and returns it as an object representation  
 * Returns empty object if .env not present
 * @returns {Promise<object, Error>} .env represented as a JS object, example: `KEY=VALUE` => `{ "KEY": "VALUE" }`
 */
function parseEnvFile()
{
    return new Promise(async (res, rej) => {
        try
        {
            if(!(await filesystem.exists("./.env")))
                return res({});

            const buf = await readFile("./.env");

            const env = dotenv.parse(buf);
    
            return res(env);
        }
        catch(err)
        {
            return rej(new Error(`Error while parsing env file: ${err}`))
        }
    });
}

/**
 * Builds a .env file
 * @param {object} envFile An object representation of a .env file, example: `KEY=VALUE` => `{ "KEY": "VALUE" }`
 * @returns {Promise<string, Error>}
 */
function buildEnvFile(envFile)
{
    return new Promise(async (res, rej) => {
        try
        {
            const lines = [];

            Object.keys(envFile).forEach(key => {
                const val = envFile[key];

                lines.push(`${key}=${val}`);
            });

            return res(`${lines.join("\n")}${lines.length > 0 ? "\n" : ""}`);
        }
        catch(err)
        {
            return rej(new Error(`Error while building env file: ${err}`))
        }
    });
}

/**
 * Writes an object representation of an env file to the local .env file
 * @param {object} envFile An object representation of a .env file, example: `KEY=VALUE` => `{ "KEY": "VALUE" }`
 * @returns {Promise<void, Error>}
 */
function writeEnvFile(envFile)
{
    return new Promise(async (res, rej) => {
        try
        {
            const content = await buildEnvFile(envFile);

            await writeFile("./.env", content);

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Error while writing env file: ${err}`))
        }
    });
}


init();
