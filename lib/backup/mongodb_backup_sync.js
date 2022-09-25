const fs = require('fs')
const path = require('path')
const {NodeSSH} = require('node-ssh')
 
const ssh = new NodeSSH()

// Concatenate root directory path with our backup folder.
// const destinationDirPath = path.join(__dirname, '..', '..', 'database-backup', 'backup', '/');
let destinationDirPath = '/var/database/backup/';
 
let backupSync = (sourceDirPath) => {
  console.log(sourceDirPath)
    ssh.connect({
        host: '139.59.36.117',
        username: 'root',
        port: 22,
        password: 'Amana100!@#',
        tryKeyboard: true,
      }).then(function() {
          // Putting entire directories
        const failed = []
        const successful = []
        ssh.putDirectory(sourceDirPath, destinationDirPath, {
          recursive: true,
          concurrency: 10,
          // ^ WARNING: Not all servers support high concurrency
          // try a bunch of values and see what works on your server
          validate: function(itemPath) {
            const baseName = path.basename(itemPath)
            return baseName.substr(0, 1) !== '.' && // do not allow dot files
                   baseName !== 'node_modules' // do not allow node_modules
          },
          tick: function(localPath, remotePath, error) {
            if (error) {
              failed.push(localPath)
            } else {
              successful.push(localPath)
            }
          }
        }).then(function(status) {
          console.log('the directory transfer was', status ? 'successful' : 'unsuccessful')
          console.log('failed transfers', failed.join(', '))
          console.log('successful transfers', successful.join(', '))
        })
      })
}

module.exports = backupSync