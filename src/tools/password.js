// TODO: write tool to manage password

const dotenv = require("dotenv");
const { pause, SelectionMenu } = require("svcorelib");

dotenv.config();

const { exit, env } = process;


function init()
{
    process.stdin.setRawMode(true);

    menu();
}

async function menu()
{
    console.clear();

    const sm = new SelectionMenu("Node-Notifier Password Manager");

    sm.locale.cancel = "Exit";

    sm.setOptions([
        "Set new password",
        "Delete current password",
        "Exit",
    ]);

    sm.open();
    
    const { canceled, option } = await sm.onSubmit();

    if(canceled)
        return exit(0);

    // TODO:
    switch(option.index)
    {
        case 0: // set new
            await setNewPassword();
        break;
        case 1: // delete current
            await deletePassword();
        break;
        default:
        case 2: // exit
            return exit(0);
    }

    const char = await pause(`Press [q] to quit or any other key to return to the menu...`);

    if(char === "q")
        return exit(0);

    return menu();
}

/**
 * Prompts the user to set a new password
 * @returns {Promise<void, Error>}
 */
function setNewPassword()
{
    return new Promise(async (res, rej) => {
        try
        {
            return res();
        }
        catch(err)
        {
            return rej(new Error(`Error while setting new password: ${err}`))
        }
    });
}

/**
 * Prompts the user to delete the current password
 * @returns {Promise<void, Error>}
 */
function deletePassword()
{
    return new Promise(async (res, rej) => {
        try
        {
            return res();
        }
        catch(err)
        {
            return rej(new Error(`Error while deleting password: ${err}`))
        }
    });
}



init();
