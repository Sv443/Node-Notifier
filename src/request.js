const { cfg } = require("./config");

/** @typedef {import("axios").AxiosRequestConfig} AxiosRequestConfig */


/**
 * @returns {Partial<AxiosRequestConfig>}
 */
function getAxiosCfg()
{
    const proxyCfg = cfg.server.proxy;
    const proxyNeedsAuth = proxyCfg.user.length && proxyCfg.user.length > 0;

    return proxyCfg.enabled ? {
        proxy: {
            host: proxyCfg.host,
            port: proxyCfg.port,
            ...(!proxyNeedsAuth ? {} : {
                auth: {
                    username: proxyCfg.user,
                    password: proxyCfg.pass,
                }
            }),
        },
    } : {};
}

module.exports = { getAxiosCfg };
