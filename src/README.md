### Code Overview / Sections:

<br>

> **Wrapper & Tools:**  
> This section contains all CLI user interaction.  
> Its main responsibilities are for launching the background process and giving the user the ability to manage Node-Notifier.  
>   
> Launch with `npm start` or `node .`  
>   
> Files:
> - [`src/Node-Notifier.js`](./src/Node-Notifier.js) (entrypoint)
> - [`src/tools/*`](./src/tools)

<br>

> **Background Process / Internal Server:**  
> This section contains the background process, which is launched through pm2 by the wrapper process.  
> After launch, the wrapper and background process are completely separate and independent from each other.  
>   
> Launch the background process manually with `npm run debug`  
>   
> Files:
> - [`src/main.js`](./src/main.js) (entrypoint)
> - [`src/*`](./src)

<br>

> **Dashboard:**  
> The dashboard website is served by the internal server, so it is kind of a sub-section of it.  
>   
> The only way for the dashboard and other sections to communicate is through the [internal properties.](../.notifier/properties.json)  
> Reading and setting these properties is possible through the internal endpoints at `/int/*` as long as auth is provided.  
>   
> Files:
> - [`src/server.js`](./src/server.js) (entrypoint)
> - [`www/*`](./www) (served files)
