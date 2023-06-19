const fs = require('fs');

async function home (req, res) {
  let accounts = await fs.readdirSync('./accounts/');
  let toDelete = accounts.indexOf('shared');
  accounts.splice(toDelete, 1);

  res.render('home', { accounts: accounts });
}

module.exports = home;
