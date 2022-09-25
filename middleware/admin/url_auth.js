const jwt = require('jsonwebtoken');
const config = require('config');
const Admin = require('../../models/admin/Admin');

module.exports = (roleName='dashboard') => {
    return async (req, res, next) => {
        // Get header token
        const token = req.cookies.token;
    
        if (!token) {
            return res.redirect('/login')
        }
    
        // Verify token
        try {
            const decode = jwt.verify(token, config.get('jwtSecrect'));
    
            req.admin = decode.admin;
    
            let adminInfo = await Admin.findById(decode.admin.id).select('_id name admin_roles superAdmin active')
    
            if(adminInfo==null || adminInfo.active == false){
                return res.redirect('/login')
            }

            if(!adminInfo.admin_roles.includes(roleName)){
                return res.redirect('/dashboard')
            }
    
            req.adminInfo = adminInfo
            
            next();
        } catch (err) {
            return res.status(401).json({
                msg: 'Authorization not valid'
            });
        }
    }
}