import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createDatabase } from "./database.js";

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || "0.0.0.0";
const db = createDatabase();
const server = createServer(createApp(db));

server.listen(port, host, () => {
  console.info(`TaskFlow listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
