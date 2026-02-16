const http = require("node:http");
const { handleRequest } = require("./app");
const { config } = require("./src/lib/env");

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: error.message || "Unhandled server error" }));
      return;
    }
    res.end();
  });
});

server.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});

module.exports = {
  server
};
