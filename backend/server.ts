import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initSocket } from "./lib/socket";
import { getPort } from "./lib/env";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = getPort();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    handle(req, res, parsedUrl);
  });

  initSocket(server);

  server.listen(port, () => {
    console.log(`> Backend ready on port ${port}`);
  });
});
