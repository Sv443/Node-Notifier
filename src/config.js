const YAML = require("yaml");
const { readFileSync, existsSync, writeFileSync } = require("fs-extra");
const { resolve } = require("path");
const { default: watch } = require("node-watch");
const { reserialize } = require("svcorelib");
const { brotliDecompressSync } = require("zlib");
const settings = require("./settings");


/** @typedef {import("./types").ConfigFile} ConfigFile */


const cfgYamlPath = resolve("./config.yml");

let daemonInitialized = false;

/**
 * Reads the config.yml file and parses it into an object, then updates the export `cfg` with it and also returns it
 * @returns {ConfigFile}
 */
function readConfig()
{
    if(!existsSync(cfgYamlPath))
        writeFileSync(cfgYamlPath, getCfgTemplate());

    const cfgCont = readFileSync(cfgYamlPath);

    /** @type {ConfigFile} */
    const parsed = YAML.parse(cfgCont.toString());
    
    if(!daemonInitialized)
        initDaemon();

    return reserialize(parsed);
}

/**
 * Initializes the node-watch daemon on the config.yml file to automatically reload it whenever it is edited
 */
function initDaemon()
{
    if(daemonInitialized)
        return;

    const watcher = watch(cfgYamlPath, { delay: settings.server.daemonInterval });

    watcher.on("change", readConfig);

    daemonInitialized = true;
}

/**
 * Returns the config template YAML file
 * @returns {string}
 */
function getCfgTemplate()
{
    // Update from './config.yml' with the command 'npm run enc-conf'

    const template = `\
        GwkJAIyUbq5QkoFutmeZrlBRTLK92+Tok5fQWKXfysLy+n3TVqqwKHfe5v+ZyWOTK6UpDnUPn93rjjiIQ6EMQiIFKuJ0Rw445FoBWn9uZw
        NB9xJjQ9Aj7N+rW5q1rJEOsRdJtj1QWuajtND4clwlK1VeOD/qazCTuIIs0zlrEXbllEX0jc0iHX27sEc2G+UcJSGOlNaAjT0GFRR1HYTB
        RGHb5edFtmjDWnD6ne0aZduMn0rJroPtW0OeD++emjZiO5Y01YOOgLltdEaC+bkvYAz9wXR2J11TJBgiLEPpCXmwmPhgM1EoeAVPvMS7zP
        kUGejIZgWgYaHBHhOzxsgix8M1CCJgtsHzeFrua4vyK4yyCKf895lD4MHWHXdfQ4SUtDozya869zx6fj64v0hX0ZcEXTwf3WNiHrl+MLbz
        8PYKZ7N+K/OigMBahSpMbBzzdJvxysrsWqtKVJIR2FjQG01+6ccE2tF9SlXebFy02HhEu8D1bTXAV1kJ1srv9rOv6NGLSCgB0zBrdK55pB
        X84TEDhYk6dbgrA/QyaUhKpYcKVaWO+sinvn1xX4OomRWhKGlCCxBdQwpLb+T876UIwU/pPd/3cjcFS5l16AeZjSammTzOt6SHiFp/Xxjd
        NVyzlJtZpHj4IQrLogLBfOvF7Lj4+2uCUfQwQRAi1MUUwpF6ZoEoIYekta0t66lO/LqZyexSDg7tOBZFlpyXBw76wgDcao/Di3vFOI3yQQ
        p7EwCBQq63mMZYpcWsIA7JtBjnqaFkgtCtzI6+KuDK4YJRXgkdxYFJz5seB24Qx0227l6K4/VPFK8EACw/SB3P8RzfWip+pPTPl/bbGTUW
        3Sfvgc7UU2fwVRb6SdAfP85ViPwGrOlJ8hq+PF5DA+26o3uoCP+wJn3Q2ZbDdRojwrbKf3NQfk9ravpvecp2tu0yjQJbslXbaDtanaZDGg
        DYImkCAuy3JPI8TH3U2/NrE8g26CyA9HRKjVKkWnV/XOqzbSRHv7cpeQjjIssw4HkfPwmZoEBwFhQXQ18b6ZrGdlSmX1i9SMgl79JkVXQM
        y5AhWTQ1gVkPwc8VY1fOE8B3Ja69QiFKEwNuxiUfzbG3mBqbeVnHZxFCD5EG1777TDuqi8/ytJSDUDRmBA==\
    `;

    const serEncTempl = template.split(/\n/gm).map(l => l.trim()).join("");

    const rawCfg = Buffer.from(serEncTempl, "base64");

    const decodedConfig = brotliDecompressSync(rawCfg).toString();

    return decodedConfig;
}

module.exports.cfg = readConfig();
