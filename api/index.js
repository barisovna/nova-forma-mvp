const { handleRequest } = require("../app");

module.exports = async (req, res) => {
  await handleRequest(req, res);
};
