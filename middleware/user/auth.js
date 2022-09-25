const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../../models/User');

module.exports = async (req, res, next) => {
    // Get header token
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(200).json({
            msg: 'No token, authorization denied',
            success: false
        });
    }

    // Verify token
    try {
        const decode = jwt.verify(token, config.get('jwtSecrect'));

        req.user = decode.user;

        let userInfo = await User.findById(decode.user.id)

        if(userInfo==null){
            return res.status(401).json({
                msg: 'Authorization not valid'
            });
        }


        next();
    } catch (err) {
        return res.status(200).json({
            msg: 'Authorization not valid',
            success: false
        });
    }

}