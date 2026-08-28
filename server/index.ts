import { UsageBudget } from "./budget.js";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { site } from "./site.js";

const config = loadConfig();
const budget = await UsageBudget.load(config.budgetPath, config.budgetSalt);
const server = createApp(config, budget);

server.listen(config.port, config.host, () => {
  console.log(`${site.host} listening on http://${config.host}:${config.port}`);
});
