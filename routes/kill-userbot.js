const fs = require('fs');
const process = require('node:process');

async function killUserbot (req, res) {
  if (req.app.locals[req.params.name]) {
    process.kill(req.app.locals[req.params.name]);
  }

  res.redirect('/accounts/' + req.params.name);
}

module.exports = killUserbot;
