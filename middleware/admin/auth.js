const jwt = require('jsonwebtoken');
const config = require('config');
const Admin = require('../../models/admin/Admin');

module.exports = async (req, res, next) => {
    // Get header token
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({
            msg: 'No token, authorization denied'
        });
    }

    // Verify token
    try {
        const decode = jwt.verify(token, config.get('jwtSecrect'));

        req.admin = decode.admin;

        let adminInfo = await Admin.findById(decode.admin.id)

        if(adminInfo==null || adminInfo.active == false){
            return res.status(401).json({
                msg: 'Authorization not valid'
            });
        }
        
        req.adminInfo = adminInfo
        next();
    } catch (err) {
        return res.status(401).json({
            msg: 'Authorization not valid'
        });
    }
}