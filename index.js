const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser());

// View engine
app.set('views', './views');
app.set('view engine', 'pug');

// Routes
app.use(express.static('accounts'));
app.use(require('./routes/router.js'));

app.listen(3000, function () {
  console.log("App in funzione all'indirizzo: localhost:3000");
});
