const { filesystem, reserialize } = require("svcorelib");
const { resolve } = require("path");
const { ensureDir, writeFile, copyFile, readFile } = require("fs-extra");
const { hide } = require("hidefile");

const packageJSON = require("../package.json");

/** @typedef {import("svcorelib").JSONCompatible} JSONCompatible */
/** @typedef {import("../.notifier/properties.json")} PropJsonFile */


/**
 * Contains all file paths
 * @readonly
 */
const paths = Object.freeze({
    propJson: resolve("./.notifier/properties.json"),
});


/**
 * Initializes all directories
 * @returns {Promise<void, Error>}
 */
function initDirs()
{
    return new Promise(async (res, rej) => {
        let stage = "ensuring ./assets exists";

        try
        {
            await ensureDir("./assets");

            stage = "checking if ./.notifier exists";

            if(!(await filesystem.exists("./.notifier")))
            {
                stage = "creating ./notifier";
                await ensureDir("./notifier");

                stage = "hiding directory ./notifier";
                await hidePath("./notifier");

                stage = `creating ${paths.propJson} from template`;
                await writeFile(paths.propJson, getPropJsonTemplate());

                stage = "copying ./www/favicon.png to ./assets/example.png";
                await copyFile("./www/favicon.png", "./assets/example.png");
            }

            stage = "checking if properties.json exists";
            if(!(await filesystem.exists(paths.propJson)))
            {
                stage = "creating properties.json";
                
                createPropJsonFile();
            }

            stage = "(done)";

            return res();
        }
        catch(err)
        {
            return rej(new Error(`InitDirs: Error while ${stage}: ${err}`));
        }
    });
}

/**
 * Hides a folder or file at the given path and returns its new path
 * @param {string} path
 * @returns {Promise<string, string>} Resolves with new path after hiding, rejects with Error instance
 */
function hidePath(path)
{
    return new Promise((res, rej) => {
        hide(path, (err, newPath) => {
            if(err)
                return rej(err);

            return res(newPath);
        });
    });
}

/**
 * Returns the properties.json template
 * @returns {string}
 */
function getPropJsonTemplate()
{
    const propJTemp = [
        `{`,
        `"info": "Please don't modify anything in this file, this is an internal file created and used by Node-Notifier",`,
        `"directoriesInitialized": ${Date.now()},`,
        `"initVersion": "${packageJSON.version}"`,
        `}`
    ];

    return JSON.stringify(JSON.parse(propJTemp.join("")), undefined, 4);
}

/**
 * Creates the properties.json file
 * @returns {Promise<void, (Error | string)>}
 */
function createPropJsonFile()
{
    return new Promise(async (res, rej) => {
        try
        {
            const propJPath = resolve("./.notifier/properties.json");
            await writeFile(propJPath, getPropJsonTemplate());

            return res();
        }
        catch(err)
        {
            return rej(err);
        }
    });
}

/**
 * Reads the properties.json file and returns it.  
 * Also creates the file if it doesn't exist yet.
 * @returns {Promise<PropJsonFile, (Error | string)>}
 */
function getProperties()
{
    return new Promise(async (res, rej) => {
        try
        {
            if(!(await filesystem.exists("./.notifier/properties.json")))
                createPropJsonFile();

            const fileContent = await readFile(paths.propJson);

            const parsed = JSON.parse(fileContent.toString());

            return res(parsed);
        }
        catch(err)
        {
            return rej(new Error(`Error while reading properties.json file: ${err}`));
        }
    });
}

/**
 * Sets a property of the properties.json file with the given `key` to the given JSON-compatible `value`
 * @param {keyof(PropJsonFile)} key
 * @param {JSONCompatible} value
 * @returns {Promise<void, (Error | string)>}
 */
function setProperty(key, value)
{
    return new Promise(async (res, rej) => {
        try
        {
            const oldContent = await getProperties();

            const newContent = reserialize(oldContent);
            newContent[key] = value;

            await writeFile(paths.propJson, JSON.stringify(newContent, undefined, 4));

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Error while setting properties.json property with key '${key}' to value '${value}': ${err}`));
        }
    });
}

module.exports = {
    initDirs,
    hidePath,
    getProperties,
    setProperty,
};
