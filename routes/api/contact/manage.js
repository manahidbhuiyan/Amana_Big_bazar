const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator')
const nodemailer = require("nodemailer");

const config = require('config')

// @route POST api/upload/image/create
// @description upload image
// @access Private - admin access
router.post('/send', [
    check('name', 'Name should not be empty').not().isEmpty(),
    check('email', 'Email should not be empty').not().isEmpty(),
    check('email', 'Enter valid email address').isEmail(),
    check('phone', 'Phone should not be empty').not().isEmpty(),
    check('message', 'Message should not be empty').not().isEmpty(),
], async (req, res) => {
    const error = validationResult(req);

    if (!error.isEmpty()) {
        return res.status(200).json({
            errors: error.array()
        })
    }

    const {
        name,
        email,
        phone,
        message
    } = req.body;
    try {

        let transporter = nodemailer.createTransport({
            host: config.get('mailConfig').host,
            port: config.get('mailConfig').port,
            secure: false,
            auth: {
                user: config.get('mailConfig').auth.email,
                pass: config.get('mailConfig').auth.password,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        let info = await transporter.sendMail({
            from: email,
            to: 'info@eamanabigbazar.com',
            subject: "Customer message",
            html: "I am <b>" + name + "</b>. Phone number <b>" + phone + "</b>.<br/>" + message,
        });
        res.status(200).json({
            msg: 'Your message send successfully',
            success: true
        });
    } catch (error) {
        console.error(error.message)
        res.status(500).send('Server error')
    }
})


module.exports = router