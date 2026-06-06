import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initSocket } from "./lib/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    handle(req, res, parsedUrl);
  });

  initSocket(server);

  server.listen(port, () => {
    console.log(`> Backend ready on http://localhost:${port}`);
  });
});
