const fs = require('fs');

async function accountDetails (req, res) {
  let details = require('../accounts/' + req.params.name + '/data.json');
  let lines; 

  if (fs.existsSync('./accounts/' + req.params.name + '/output.log')) {
    let allLines = fs.readFileSync('./accounts/' + req.params.name + '/output.log', 'utf-8')
	             .split("\n")
	             .filter(Boolean);

    lines = allLines.slice(-10).reverse();
  }

  res.render('account-details', { details: details, lines: lines });
}

module.exports = accountDetails;
