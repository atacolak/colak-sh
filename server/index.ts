import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const server = createApp();

server.listen(port, host, () => {
  console.log(`colak.sh listening on http://${host}:${port}`);
});
