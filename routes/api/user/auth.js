const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

// Load bcrypt
const bcrypt = require('bcryptjs');
// Load jwt
const jwt = require('jsonwebtoken');
// Load Config
const config = require('config');

const auth = require('../../../middleware/user/auth');
const User = require('../../../models/User');

// @route GET api/auth
// @description User Route
// @access Private
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').select('-forgot');
        res.status(200).json({
            success: true,
            info: user
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route POST api/auth/login
// @description User login and generate token
// @access Public
router.post(
    '/login',
    [
        check('email', 'Email or phone should not be empty').not().isEmpty(),
        check('password', 'Password should not be empty').not().isEmpty()
    ],
    async (req, res) => {
        const error = validationResult(req);

        if (!error.isEmpty()) {
            return res.status(200).json({
                errors: error.array()
            });
        }

        const {
            email,
            password
        } = req.body;

        try {
            // See if user exsist
            let user = await User.findOne({
                $or:[ {email}, {'phone.number':email}]
            });

            if (!user) {
                return res
                    .status(200)
                    .send({
                        errors: [{
                            msg: 'Invalid credentials',
                            param: 'auth'
                        }],
                        success: false
                    });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res
                    .status(200)
                    .send({
                        errors: [{
                            msg: 'Invalid credentials',
                            param: 'auth'
                        }],
                        success: false
                    });
            }


            // if(!user.phone.status){
            //     return res
            //         .status(200)
            //         .send({
            //             verification: false,
            //             success: true
            //         });
            // }


            // Return jsonwebtoken
            const payload = {
                user: {
                    id: user.id
                }
            }

            jwt.sign(payload, config.get('jwtSecrect'), {
                expiresIn: config.get('authTokenExpire')
            }, (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    verification: true,
                    success: true
                });
            });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    }
);

module.exports = router;