const fs = require('fs');
const spawn = require('child_process').spawn;

async function startUserbot (req, res) {
  fs.writeFileSync('./accounts/' + req.params.name + '/output.log', "");

  const subprocess = spawn("node", [ "./userbot/index.js", req.params.name ]);
  
  subprocess.stdout.on('data', 
    (data) => {
      fs.appendFile('./accounts/' + req.params.name + '/output.log', data, () => {});
    }
  );

  subprocess.stderr.on('data', 
    (data) => {
      fs.appendFile('./accounts/' + req.params.name + '/output.log', "Si è verificato un errore! " + data, () => {});
    }
  );

  subprocess.on('close', 
    (code) => {
      if (code != 0) {
        fs.appendFile('./accounts/' + req.params.name + '/output.log', "Si è verificato un errore!", () => {});
      } else {
        fs.unlink('./accounts/' + req.params.name + '/output.log', () => {});
      }
    }
  );
  
  req.app.locals[req.params.name] = subprocess.pid;

  res.redirect('/accounts/' + req.params.name);
}

module.exports = startUserbot;
