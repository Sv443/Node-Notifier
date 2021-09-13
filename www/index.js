const port = 8042;


/** @typedef {import("../src/files").JSONCompatible} JSONCompatible */
/** @typedef {import("../src/files").PropJsonFile} PropJsonFile The properties.json file */

/** @type {import("../.notifier/properties.json")} */
let props;


document.addEventListener("DOMContentLoaded", init);


async function init()
{
    await loadProps();

    checkUpdate();
}

function loadProps()
{
    return new Promise(async (res, rej) => {
        try
        {
            const f = await fetch(`http://127.0.0.1:${port}/int/getProperties`);
            props = await f.json();

            if(props["error"] === true)
                return rej(props["message"] || "Unknown error");

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Error while loading properties from server: ${err}`));
        }
    });
}

/**
 * Sets a property of the properties.json file with the given `key` to the given JSON-compatible `value`
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

            console.log(body);

            const setPropF = await fetch(`http://127.0.0.1:${port}/int/setProperty`, {
                method: "POST",
                body,
                headers: [
                    [ "Content-Type", "application/json; charset=UTF-8" ]
                ]
            });

            const j = await setPropF.json();

            if(j["error"] === true)
                return rej(new Error(`Error while setting property with key '${key}': ${j["message"]}`));

            return res();
        }
        catch(err)
        {
            return rej(new Error(`Error while setting property with key '${key}': ${err}`));
        }
    });
}

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

        const dismissElem = document.createElement("button");
        dismissElem.innerText = "Dismiss";
        dismissElem.id = "dismissUpdate";
        dismissElem.onclick = async () => {
            await setProp("remindUpdate", false);
        };
        updElem.appendChild(dismissElem);
    }
    else
        updElem.innerText = "";
}
