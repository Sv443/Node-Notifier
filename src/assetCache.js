const { default: axios } = require("axios");
const { createWriteStream, readFile, writeFile } = require("fs-extra");
const { createHash } = require("crypto");

const { resolve } = require("path");
const { filesystem } = require("svcorelib");

const settings = require("./settings");
const config = require("../config");


/** @typedef {import("./types").CacheEntry} CacheEntry */
/** @typedef {import("./types").CacheManifest} CacheManifest */


const cacheManifPath = resolve("./.notifier/cache_manifest.json");

/**
 * Tries to download and cache the asset at `url`
 * @param {string} url
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function tryCache(url)
{
    const manif = await getManifest();

    const curTime = new Date().getTime();
    const entryExpiresAfter = config.server.assetCache.entryExpiresAfter * 1000;

    const nonExpired = manif.filter(en => (curTime - en.time) > entryExpiresAfter);

    if(nonExpired.find(en => en.url === url))
    {
        return {
            success: true,
            message: "Item exists already and didn't time out yet",
        };
    }

    // do preflight to make sure the requested resource is valid and can be downloaded
    const { status, headers } = await axios.request({ url, method: "HEAD" });

    const contTypeRaw = headers["content-type"];
    const contType = contTypeRaw.match(/;/) ? contTypeRaw.split(/;/)[0] : contTypeRaw;

    if(status < 200 || status >= 300)
    {
        return {
            success: false,
            message: `Preflight of resource yielded status ${status}`,
        };
    }

    const mimes = settings.server.dlCacheMimeTypes.map(({ mime }) => mime);

    if(contType && mimes.includes(contType))
    {
        const { data } = await axios.get(url, {
            responseType: "stream"
        });

        if(status < 200 || status >= 300)
        {
            return {
                success: false,
                message: `Couldn't GET the resource, status ${status}`,
            };
        }

        const mt = settings.server.dlCacheMimeTypes.find(t => t.mime === contType);
        const fileExt = mt ? mt.ext : "unknown";

        const assetPath = `./assets/cachetest.${fileExt}`;

        data.pipe(createWriteStream(assetPath));


        const hash = createHash("sha256");
        hash.setEncoding("base64");

        hash.write((await readFile(assetPath)).toString());

        hash.end();

        const assetHash = hash.read().toString();

        await addCacheEntry(assetPath, url, assetHash);

        return {
            success: true,
            message: "Successfully fetched asset and added cache entry",
        };
    }
    else
    {
        return {
            success: false,
            message: `Content type '${contType}' of the requested resource is not supported by Node-Notifier`,
        };
    }
}

/**
 * Adds an entry in the cache manifest using the provided asset `path`, `url` and `hash`
 * @param {string} path
 * @param {string} url
 * @param {string} hash
 * @returns {Promise<void>}
 */
async function addCacheEntry(path, url, hash)
{
    if(!(await filesystem.exists(cacheManifPath)))
        await writeFile(cacheManifPath, "[]");

    /** @type {CacheEntry} */
    const newCacheEntry = {
        path,
        url,
        hash,
        time: new Date().getTime(),
    };

    const manif = await getManifest();

    // if cache manifest already contains the entry
    if(manif.find(en => en.hash === newCacheEntry.hash))
        return;

    // if cache manifest contains an entry with the same url but the hashes are different, the old entry needs to be deleted, as it is now superseded by the newCacheEntry
    let newManif;
    const oldEntry = manif.find(en => en.url === newCacheEntry.url && en.hash !== newCacheEntry.hash);

    if(typeof oldEntry === "object")
        newManif = await removeOldEntry(manif, oldEntry);

    // delete all expired entries while we're at it
    const curTime = new Date().getTime();
    const entryExpiresAfter = config.server.assetCache.entryExpiresAfter * 1000;

    const nonExpired = (newManif || manif).filter(en => (curTime - en.time) > entryExpiresAfter);

    nonExpired.push(newCacheEntry);

    await writeFile(cacheManifPath, JSON.stringify(nonExpired));
}

/**
 * Removes the `oldEntry` from the cache `manif`, then returns the new cache manifest
 * @param {CacheManifest} manif
 * @param {CacheEntry} oldEntry
 * @returns {CacheManifest}
 */
async function removeOldEntry(manif, oldEntry)
{
    manif = manif.filter(en => !(en.url === oldEntry.url && en.hash !== oldEntry.hash));

    return manif || [];
}

/**
 * @returns {Promise<CacheManifest>}
 */
async function getManifest()
{
    try
    {
        const cacheRaw = await readFile(cacheManifPath);
        /** @type {CacheManifest} */
        const manif = JSON.parse(cacheRaw.toString());

        return manif;
    }
    catch(err)
    {
        if(!(await filesystem.exists(cacheManifPath)))
        {
            await writeFile(cacheManifPath, "[]");

            return [];
        }

        throw (err instanceof Error) ? err : new Error(err.toString());
    }
}

async function dbg()
{
    const { success, message } = await tryCache("https://i.kym-cdn.com/photos/images/original/001/658/936/411.jpg");

    if(success)
        console.log("succ");
    else
        console.log("err:", message);
}

module.exports = { tryCache, getManifest,  /*#DEBUG#*/ dbg };
