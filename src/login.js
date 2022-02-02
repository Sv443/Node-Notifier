const { readFile, writeFile } = require("fs-extra");
const { filesystem, allOfType, colors } = require("svcorelib");
const dotenv = require("dotenv");
const prompt = require("prompts");

const { hashPass } = require("./auth");

const col = colors.fg;


/** @typedef {import("./types").LoginTuple} LoginTuple */


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
            if(!(await filesystem.exists("./.notifier/.env")))
                return res({});

            const buf = await readFile("./.notifier/.env");

            const env = dotenv.parse(buf);
    
            return res(env);
        }
        catch(err)
        {
            return rej(new Error(`Couldn't parse '.notifier/.env' file: ${err}`));
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

                lines.push(`${key}="${val}"`);
            });

            return res(`${lines.join("\n")}${lines.length > 0 ? "\n" : ""}`);
        }
        catch(err)
        {
            return rej(new Error(`Couldn't create '.notifier/.env' file: ${err}`));
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

            await writeFile("./.notifier/.env", content);

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Couldn't write '.notifier/.env' file: ${err}`));
        }
    });
}

/**
 * Prompts the user to input new login data
 * @returns {Promise<(LoginTuple|null[])>} Resolves with a string tuple: First item is username, second item is hashed password - both values null if user canceled
 */
function promptNewLogin()
{
    return new Promise(async (res, rej) => {
        try
        {
            /** Filter function used to deny empty prompts */
            const validate = (val) => val != "";

            const { user } = await prompt({
                type: "text",
                name: "user",
                message: "Set your username",
                validate,
            });

            const getPass = () => new Promise(async res => {
                const { passRaw } = await prompt({
                    type: "password",
                    name: "passRaw",
                    message: "Set your password",
                    validate,
                });

                const { passConf } = await prompt({
                    type: "password",
                    name: "passConf",
                    message: "Confirm the password",
                    validate,
                });

                if(passRaw == undefined || passConf == undefined)
                    return res(undefined);
                else if(passRaw != passConf)
                {
                    console.log(`\n\n${col.yellow}The password and its confirmation don't match${col.rst}\n`);

                    const { tryAgain } = await prompt({
                        type: "confirm",
                        name: "tryAgain",
                        message: "Do you want to try again?"
                    });

                    if(tryAgain)
                    {
                        console.log("\n\n");

                        return res(await getPass());
                    }
                    else
                        return res(undefined);
                }
                else
                    return res(hashPass(passRaw));
            });

            /** @type {string|undefined} password hash */
            const pass = await getPass();

            if(
                (!user || !pass) ||
                !allOfType([ user, pass ], "string") ||
                (user.length == 0 || user.length == 0)
            )
            {
                console.log(`\n\n${col.yellow}Username and/or password are invalid${col.rst}\n`);

                const { tryAgain } = await prompt({
                    type: "confirm",
                    name: "tryAgain",
                    message: "Do you want to enter them again?"
                });

                if(tryAgain)
                {
                    console.log("\n\n");

                    return res(await promptNewLogin());
                }
                else
                    return res([ null, null ]);
            }

            return res([ user, pass ]);
        }
        catch(err)
        {
            return rej(new Error(`Couldn't prompt for a new login: ${err}`));
        }
    });
}

module.exports = {
    parseEnvFile,
    writeEnvFile,
    promptNewLogin,
};
