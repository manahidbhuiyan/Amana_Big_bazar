const admin = require('./admin')
const getAdminData = require('./get')
const removeAdminData = require('./remove')
const updateAdminData = require('./update')
const auth = require('./auth')
const verify = require('./common/verify')
const forgot = require('./common/forgot')
const reset = require('./common/reset')
const removeReportPermission = require('./remove-report-permission')

module.exports={
    admin,
    getAdminData,
    removeAdminData,
    updateAdminData,
    auth,
    verify,
    forgot,
    reset,
    removeReportPermission
}