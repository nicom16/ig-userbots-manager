const fs = require('fs');

async function editAccount (req, res) {
  let account = require('../accounts/' + req.params.name + '/data.json');
  
  Object.keys(req.body).forEach((key) => {
    if (req.body[key]) {
      account[key] = req.body[key];
    }
  });
  
  let updatedAccount = JSON.stringify(account);
  fs.writeFileSync('./accounts/' + req.params.name + '/data.json', updatedAccount);

  res.redirect('/accounts/' + req.params.name);
}

module.exports = editAccount;
