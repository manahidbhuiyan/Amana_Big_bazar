const express = require('express')
const router = express.Router()
// Load jwt
const jwt = require('jsonwebtoken')
// Load Config 
const config = require('config')
// Load Admin Model
const Admin = require('../../../../models/admin/Admin')
// Load Express Validator
const {check, validationResult} = require('express-validator')
// Load uuidv1
const uuidv1 = require('uuid')

const sendEmail = require('../../../../lib/email/sendEmailModule')


// @route Post api/admin/password/forgot
// @description Reset new paasword
// @access Public
router.post('/forgot', [
    check('email', 'Email should be in email format').isEmail()
], async (req, res)=>{
    const error = validationResult(req);

    if(!error.isEmpty()){
        return res.status(400).json({
            errors: error.array()
        })
    }

    const forgotCode = uuidv1()
    const { email } = req.body

    try {
        let admin = await Admin.findOne({
            email
          })

        if(!admin){
            return res.status(400).json({
                errors: [{
                    msg: 'This email address is not valid.'
                }]
            });
        }

        const templateDetails = {
            folder: "reset",
            filename: "index.ejs",
            data:{
                code: forgotCode,
                company: config.get('company'),
                host:  config.get('adminRedirect'),
                resetLink: '/reset/',
                companyname: config.get('basicEmailInfo').companyName,
                supportEmail: config.get('basicEmailInfo').supportEmail,
                button:{
                    text: 'Click Here'
                },
                user:{
                    name: admin.name
                }
            }
        }

        const emailOptions = {
            from: config.get('basicEmailInfo').fromEmail,
            to: admin.email,
            subject: 'Password reset link'
        }

        sendEmail(templateDetails, null, null, emailOptions)

        admin.forgot = {
            code: forgotCode,
            status: false,
            date: Date.now()
        }

        await admin.save()  

        res.status(200).json({
            success: "Password reset link has been sent"
        });

    } catch (error) {
        console.error(error.message)
        res.status(500).send('Server error')
    }
})

module.exports = router