const fs = require('fs');

async function addAccount (req, res) {
  let newAccount = JSON.stringify(req.body);

  fs.mkdirSync('./accounts/' + req.body.username);
  fs.writeFileSync('./accounts/' + req.body.username + '/data.json', newAccount);
  
  res.redirect('/');
}

module.exports = addAccount;
