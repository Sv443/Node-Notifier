// TODO: write tool to manage password

const { readFile, writeFile } = require("fs-extra");
const { filesystem } = require("svcorelib");
const dotenv = require("dotenv");


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

            await writeFile("./.env", content);

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Couldn't write '.notifier/.env' file: ${err}`));
        }
    });
}

module.exports = {
    parseEnvFile,
    buildEnvFile,
    writeEnvFile,
};
