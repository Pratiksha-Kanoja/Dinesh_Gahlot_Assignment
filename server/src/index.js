import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createDatabase } from "./database.js";

const port = Number(process.env.PORT || 4000);
const db = createDatabase();
const server = createServer(createApp(db));

server.listen(port, "127.0.0.1", () => {
  console.info(`TaskFlow API listening on http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
