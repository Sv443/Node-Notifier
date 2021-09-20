// TODO: write tool to manage password

const { readFile, writeFile } = require("fs-extra");
const { filesystem, isEmpty, allOfType, isArrayEmpty } = require("svcorelib");
const dotenv = require("dotenv");
const prompt = require("prompts");

const { hashPass } = require("./auth");


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
 * @returns {Promise<(string[]|null), Error>} First item is username, second item is unhashed password - resolves null if user canceled
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

            const getPass = () => new Promise(async res => {
                const passRaw = await prompt({
                    type: "password",
                    name: "pass",
                    message: "Set your password",
                    validate
                });
    
                return res(hashPass(passRaw));
            });

            /** @type {string} password hash */
            const pass = await getPass();

            if(!allOfType([ user, pass ], "string") || isArrayEmpty([ user, pass ]) === true)
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
                    return res(null);
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
