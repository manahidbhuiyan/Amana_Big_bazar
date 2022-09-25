const loginAuth = require('./operation/login')
const registerAuth = require('./operation/register')
const forgotAuth = require('./operation/forgot')
const resetAuth = require('./operation/reset')

module.exports={
    loginAuth,
    registerAuth,
    forgotAuth,
    resetAuth
}