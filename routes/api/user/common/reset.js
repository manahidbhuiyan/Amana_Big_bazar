const express = require('express')
const router = express.Router()
// Load Express Validator
const {check, validationResult} = require('express-validator')
// Load bcrypt
const bcrypt = require('bcryptjs')
// Load User Model
const User = require('../../../../models/User')

// @route Post api/auth/user/password/reset
// @description Reset new paasword
// @access Private
router.post('/password/reset', [
    check('userID', 'User id should not be empty').not().isEmpty(),
    check('code', 'Verification code should be 4 digit').matches(/^\d{4}$/, "i"),
    check('password', 'Password should be 6 or more characters').isLength({
        min: 6
    }),
    check('confirm_password', 'Passwords do not match').custom((value, {req}) => value == req.body.password)
], async (req, res)=>{
    const error = validationResult(req);

    if(!error.isEmpty()){
        return res.status(200).json({
            errors: error.array()
        })
    }

    const {userID, password, code} = req.body;
    try {
        let user = await User.findById(userID)

        if(!user){
            return res.status(200).json({
                errors: [
                    {
                      msg: 'User is not exist',
                      param: 'auth'
                    }
                ],
                success: false
            });
        }

        if(user.forgot.code != code){
            return res.status(200).json({
                errors: [
                    {
                      msg: 'Verification code not matched',
                      param: 'auth'
                    }
                ],
                success: false
            });
        }

        // Encrypt password
        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(password, salt)
        
        user.forgot = {
            code: null,
            status: false,
            date: Date.now()
        }

        await user.save()  
        res.status(200).json({
            msg: 'New password has been set successfully',
            success: true
        });   
    } catch (error) {
        console.error(error.message)
        res.status(500).send('Server error')
    }
})

module.exports = router