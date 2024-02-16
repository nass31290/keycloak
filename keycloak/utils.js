const fs = require('fs');
const ues = require('./data.json');

function saveUesToFile(callback) {
    fs.writeFile('./data.json', JSON.stringify(ues), (err) => {
      if (err) {
        console.error('Error while writing file: ', err);
        callback('Error while writing file', 500);
      } else {
        callback(null, 200);
      }
    });
}

// export functions
module.exports = {
    saveUesToFile
};