const { filesystem, reserialize } = require("svcorelib");
const { resolve } = require("path");
const { ensureDir, writeFile, copyFile, readFile } = require("fs-extra");
const { hide } = require("hidefile");

const packageJSON = require("../package.json");

/** @typedef {import("svcorelib").JSONCompatible} JSONCompatible */
/** @typedef {import("../.notifier/properties.json")} PropJsonFile The properties.json file */


/**
 * Contains all file paths
 * @readonly
 */
const paths = Object.freeze({
    propJson: resolve("./.notifier/properties.json"),
});


// #MARKER other

/**
 * Initializes all directories
 * @returns {Promise<void, Error>}
 */
function initDirs()
{
    return new Promise(async (res, rej) => {
        let stage = "ensuring ./assets exists";

        // TODO: either
        // - regenerate properties.json if initVersion is out of date
        // or
        // - set remindUpdate based on update version
        // so that after an update the reminder can be sent again, unless disabled in the internal settings

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
                await createPropJsonFile();

                stage = "copying ./www/favicon.png to ./assets/example.png";
                await copyFile("./www/favicon.png", "./assets/example.png");
            }

            stage = "checking if properties.json exists";
            if(!(await filesystem.exists(paths.propJson)))
            {
                stage = "creating properties.json";
                await createPropJsonFile();
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

// #MARKER properties.json

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
            const template = getPropJsonTemplate();

            await writeFile(propJPath, template);

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Error while creating properties.json file: ${err}`));
        }
    });
}

// #SECTION get/set props

/**
 * Reads the properties.json file and returns it.  
 * Also creates the file if it doesn't exist yet.
 * @returns {Promise<PropJsonFile, (Error | string)>}
 */
function getAllProperties()
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
 * Grabs the value at the specified `key` of the properties.json file and returns it.  
 * Returns `undefined` if the value wasn't found
 * @param {keyof(PropJsonFile)} key
 * @returns {Promise<(JSONCompatible | undefined), (Error | string)>}
 */
function getProperty(key)
{
    return new Promise(async (res, rej) => {
        try
        {
            const props = await getAllProperties();

            return res(props[key] || undefined);
        }
        catch(err)
        {
            return rej(err);
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
            const oldContent = await getAllProperties();

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

// #SECTION template

/**
 * Returns the properties.json template as a string
 * @returns {string}
 */
 function getPropJsonTemplate()
{
    /** @type {PropJsonFile} */
    const propJTemp = {
        info: "Please don't modify anything in this file, this is an internal file created and managed by Node-Notifier. You shouldn't modify this file unless you really know what you're doing!",
        fileCreated: Date.now(),
        initVersion: packageJSON.version,
        lastNotification: -1,
        version: null,
        latestRemoteVersion: null,
        needsUpdate: false,
        remindUpdate: true,
    };

    return JSON.stringify(propJTemp, undefined, 4);
}

module.exports = {
    initDirs,
    hidePath,
    getProperty,
    setProperty,
    getAllProperties,
};
