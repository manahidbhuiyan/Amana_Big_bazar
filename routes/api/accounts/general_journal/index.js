const addGeneralJournal = require('./add')
const getGeneralJournal= require('./get')
const updateGeneralJournal= require('./update')
const removeGeneralJournal= require('./remove')
const printGeneralJournal= require('./print')

module.exports = {
    addGeneralJournal,
    updateGeneralJournal,
    removeGeneralJournal,
    getGeneralJournal,
    printGeneralJournal
}