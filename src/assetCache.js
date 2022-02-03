const { default: axios } = require("axios");
const { createWriteStream, readFile, writeFile } = require("fs-extra");
const { createHash } = require("crypto");
const { resolve } = require("path");
const { filesystem } = require("svcorelib");

const settings = require("./settings");


/** @typedef {import("./types").CacheEntry} CacheEntry */
/** @typedef {import("./types").CacheManifest} CacheManifest */


/**
 * Tries to download and cache a resource at the specified `url`
 * @param {string} url
 * @returns {Promise<{ success: boolean, message: string }>}
 */
function tryCache(url)
{
    return new Promise(async (res) => {
        // do preflight to make sure the requested resource is valid and can be downloaded
        const { status, headers } = await axios.request({ url, method: "HEAD" });

        const contTypeRaw = headers["content-type"];
        const contType = contTypeRaw.match(/;/) ? contTypeRaw.split(/;/)[0] : contTypeRaw;

        if(status < 200 || status >= 300)
        {
            return res({
                success: false,
                message: `Preflight of resource yielded status ${status}`,
            });
        }

        const mimes = settings.server.dlCacheMimeTypes.map(({ mime }) => mime);

        if(contType && mimes.includes(contType))
        {
            const { data } = await axios.get(url, {
                responseType: "stream"
            });

            if(status < 200 || status >= 300)
            {
                return res({
                    success: false,
                    message: `Couldn't GET the resource, status ${status}`,
                });
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

            console.log();
        }
        else
        {
            return res({
                success: false,
                message: `Content type '${contType}' of the requested resource is not supported by Node-Notifier`,
            });
        }
    });
}

/**
 * Adds an entry in the cache manifest using the provided asset `path`, `url` and `hash`
 * @param {string} path
 * @param {string} url
 * @param {string} hash
 */
async function addCacheEntry(path, url, hash)
{
    const cacheManifPath = resolve("./.notifier/cache_manifest.json");

    if(!(await filesystem.exists(cacheManifPath)))
        await writeFile(cacheManifPath, "[]");

    /** @type {CacheEntry} */
    const newCacheEntry = {
        path,
        url,
        hash,
        time: new Date().getTime(),
    };

    const cacheRaw = await readFile(cacheManifPath);
    /** @type {CacheManifest} */
    const cacheManif = JSON.parse(cacheRaw.toString());

    cacheManif.push(newCacheEntry);

    await writeFile(cacheManifPath, JSON.stringify(cacheManif));
}

module.exports = { tryCache, addCacheEntry };
