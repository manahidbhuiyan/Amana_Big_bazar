const addBranchManager = require('./add')
const getBranchManager = require('./get')
const removeBranchManager = require('./remove')
const updateBranchManager = require('./update')
const printBranchManagerInfo = require('./print')
const authBranchManagerInfo = require('./auth')

module.exports={
    addBranchManager,
    removeBranchManager,
    getBranchManager,
    updateBranchManager,
    printBranchManagerInfo,
    authBranchManagerInfo
}