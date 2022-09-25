const addAdminRoute = require('./operation/add')
const updateAdminRoute = require('./operation/update')
const roleAdminRoute = require('./operation/role')
const adminListRoute = require('./operation/home')
const adminMenuRoute = require('./operation/menu')
const adminPermissionRoute = require('./operation/permission')
const adminRoleRoute = require('./operation/admin_role')

module.exports={
    addAdminRoute,
    updateAdminRoute,
    roleAdminRoute,
    adminListRoute,
    adminMenuRoute,
    adminPermissionRoute,
    adminRoleRoute
}