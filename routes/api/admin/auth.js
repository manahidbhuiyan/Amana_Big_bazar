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

const auth = require('../../../middleware/admin/auth');
const Admin = require('../../../models/admin/Admin');

// @route GET api/admin/auth
// @description Admin Route
// @access Private
router.get('/', auth, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).populate('roles',['name']).populate('branches',['name']).select('-password').select('-forgot');
        res.status(200).json(admin);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route POST api/admin/login
// @description Admin login and generate token
// @access Public
router.post(
    '/login',
    [
        check('email', 'Email should be in email format.').isEmail(),
        check('password', 'Password should not be empty.').not().isEmpty()
    ],
    async (req, res) => {
        const error = validationResult(req);

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            });
        }

        const {
            email,
            password
        } = req.body;

        try {
            // See if admin exsist
            let admin = await Admin.findOne({
                email
            });

            

            if (!admin) {
                return res
                    .status(400)
                    .send({
                        errors: [{
                            msg: 'Invalid credentials'
                        }]
                    });
            }

            if(!admin.active){
                return res
                .status(400)
                .send({
                    errors: [{
                        msg: 'Your account is inactive'
                    }]
                });
            }

            const isMatch = await bcrypt.compare(password, admin.password);

            if (!isMatch) {
                return res
                    .status(400)
                    .send({
                        errors: [{
                            msg: 'Invalid credentials'
                        }]
                    });
            }


            // Return jsonwebtoken
            const payload = {
                admin: {
                    id: admin.id
                }
            }

            jwt.sign(payload, config.get('jwtSecrect'), {
                expiresIn: config.get('authTokenExpire')
            }, (err, token) => {
                if (err) throw err;
                res.json({
                    token
                });
            });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    }
);

module.exports = router;