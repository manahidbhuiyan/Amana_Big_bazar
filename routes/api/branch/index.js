const addBranch = require('./add')
const getBranch = require('./get')
const updateBranch = require('./update')
const removeBranch = require('./remove')
const importBranch = require('./import')
const exportBranch = require('./export')

module.exports={
    addBranch,
    updateBranch,
    removeBranch,
    getBranch,
    importBranch,
    exportBranch
}