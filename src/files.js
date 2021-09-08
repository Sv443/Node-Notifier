const { filesystem } = require("svcorelib");
const { join, resolve } = require("path");
const { ensureDir, writeFile, mkdir, copyFile } = require("fs-extra");
const { hide } = require("hidefile");

const packageJSON = require("../package.json");


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

                stage = "hiding directory ./notifier"
                const notifierDir = await hidePath("./notifier");

                stage = "creating ./.notifier/properties.json from template"
                await writeFile(join(notifierDir, "properties.json"), getPropJsonTemplate());

                stage = "copying ./www/favicon.png to ./assets/example.png";
                await copyFile("./www/favicon.png", "./assets/example.png");
            }

            stage = "checking if properties.json exists";
            if(!(await filesystem.exists("./.notifier/properties.json")))
            {
                stage = "creating properties.json";
                
                const propJPath = resolve("./.notifier/properties.json");
                await writeFile(propJPath, getPropJsonTemplate());
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

module.exports = {
    initDirs,
    hidePath
};
