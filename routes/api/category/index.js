const addCategory = require('./add')
const getCategory = require('./get')
const updateCategory = require('./update')
const removeCategory = require('./remove')
const importCategory = require('./import')
const exportCategory = require('./export')

module.exports={
    addCategory,
    updateCategory,
    removeCategory,
    getCategory,
    importCategory,
    exportCategory
}