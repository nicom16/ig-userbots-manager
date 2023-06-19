const express = require('express');
const router = express.Router();

// Home page
router.get('/', require('./home.js'));

// Add and delete account
router.route('/add-account')
  .get((req, res) => res.render('add-account-form'))
  .post(require('./add-account.js'));

router.get('/delete-account', require('./delete-account.js'));

// Account deltails and edit
router.get('/accounts/:name', require('./account-details.js'));

router.route('/accounts/:name/edit')
  .get((req, res) => res.render('edit-account-form', { account: req.params.name }))
  .post(require('./edit-account.js'));

// Start and kill userbot
router.get('/accounts/:name/start-userbot', require('./start-userbot.js'));

router.get('/accounts/:name/kill-userbot', require('./kill-userbot.js'));

module.exports = router;
