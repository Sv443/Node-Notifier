const port = 8042;


/** @typedef {import("../src/types").JSONCompatible} JSONCompatible */
/** @typedef {import("../src/files").PropJsonFile} PropJsonFile The properties.json file */

/**
 * @type {PropJsonFile} Current local state of the properties.json on the server (can be outdated).  
 * Should be refreshed with `loadProps()` and should update the props on the server with `setProp()` once modified.
 */
var props;


document.addEventListener("DOMContentLoaded", init);


/**
 * Entrypoint, called after "DOMContentLoaded"
 */
async function init()
{
    await loadProps();

    setTimeout(checkUpdate, (Math.round(Math.random() * 4) * 150) + 500); // artificial timeout - see https://ux.stackexchange.com/a/83917
}

/**
 * Loads the properties.json file from the server and puts them into the global var `props`
 * @returns {Promise<void, Error>}
 */
function loadProps()
{
    return new Promise(async (res, rej) => {
        try
        {
            const f = await fetch(`http://127.0.0.1:${port}/int/getProperties`);
            const respProps = await f.json();

            if(respProps["error"] === true)
                return rej(respProps["message"] || "Unknown error");

            props = respProps;

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Error while loading properties from server: ${err}`));
        }
    });
}

/**
 * Sets a property of the properties.json file on the server with the given `key` to the given JSON-compatible `value`
 * @param {keyof(PropJsonFile)} key
 * @param {JSONCompatible} value
 * @returns {Promise<void, Error>}
 */
function setProp(key, value)
{
    return new Promise(async (res, rej) => {
        try
        {
            const body = JSON.stringify({ key, value });

            const setPropRes = await fetch(`http://127.0.0.1:${port}/int/setProperty`, {
                method: "POST",
                body,
                headers: [
                    [ "Content-Type", "application/json; charset=UTF-8" ]
                ]
            });

            const resp = await setPropRes.json();

            if(resp["error"] === true)
                return rej(new Error(`Error while setting property with key '${key}': ${resp["message"]}`));

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Error while setting property with key '${key}': ${err}`));
        }
    });
}

/**
 * Checks if there's an update to Node-Notifier.  
 * Also handles the update instructions and dismiss button.
 */
function checkUpdate()
{
    const updElem = document.querySelector("#updateMessage");

    if(props["needsUpdate"] === true && props["remindUpdate"] !== false)
    {
        const lines = [
            "An update was found for Node-Notifier.",
            `Current version: ${props["version"]} - Latest version: ${props["latestRemoteVersion"]}`,
            "",
            "To update, please go to <a href=\"https://github.com/Sv443/Node-Notifier/releases\" target=\"_blank\" rel=\"noopener noreferrer\">this page</a> and download the latest release.",
            "Then, delete the current files of Node-Notifier and replace them with the new files.",
            "After you've done that, please run the commands <kbd>pm2 del Node-Notifier</kbd> and then <kbd>npm start</kbd>",
            "Now, after visiting the dashboard, you shouldn't see this message anymore."
        ];

        updElem.innerHTML = lines.join("<br>") + "<br>";

        const dismissContainer = document.createElement("div");
        dismissContainer.id = "dismissUpdateContainer";

        const dismissElem = document.createElement("button");
        dismissElem.innerText = "Mute until next version";
        dismissElem.id = "dismissUpdate";
        dismissElem.onclick = async () => {
            try
            {
                await setProp("remindUpdate", false); // TODO: set this for each version
                updElem.innerHTML = "(Muted update reminder until the next version)";

                setTimeout(() => {
                    updElem.innerHTML = "";
                    document.querySelector("#updateMessage").classList.add("hidden");
                }, 5000);
            }
            catch(err)
            {
                const e = (err instanceof Error) ? `${err.message}${err.stack ? `\n${err.stack}` : ""}` : err.toString();
                alert(`Error while dismissing update: ${e}`);
            }
        };

        dismissContainer.appendChild(dismissElem);
        updElem.appendChild(dismissContainer);
    }
    else
    {
        updElem.innerHTML = "";
        document.querySelector("#updateMessage").classList.add("hidden");
    }
}
