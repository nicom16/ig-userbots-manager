const rimraf = require('rimraf');

async function deleteAccount (req, res) {
  const accountToDelete = req.query.account;
  
  rimraf.sync('./accounts/' + accountToDelete);
  
  res.redirect('/');
}

module.exports = deleteAccount;
