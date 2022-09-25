const user = require('./user')
const contact = require('./contact')
const updatePhoto = require('./update')
const auth = require('./auth')
const verify = require('./common/verify')
const forgot = require('./common/forgot')
const reset = require('./common/reset')

module.exports={
    user,
    contact,
    auth,
    verify,
    forgot,
    reset,
    updatePhoto
}