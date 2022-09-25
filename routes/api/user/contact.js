const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const {generateRandomNumber} = require('../../../lib/helpers');

const auth = require('../../../middleware/user/auth');
const User = require('../../../models/User');

// @route POST api/user/contact
// @description Add User Contact
// @access Private
router.post('/contact', [auth,
    [
        check('address', 'Address should not be empty.')
        .not()
        .isEmpty(),
        check('location', 'Location should not be empty.')
        .not()
        .isEmpty(),
        check('city', 'City should not be empty.')
        .not()
        .isEmpty(),
        check('division', 'Division should not be empty.')
        .not()
        .isEmpty(),
        check('phone', 'Phone should not be empty.')
        .not()
        .isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
      return res.status(400).json({
        errors: error.array()
      })
    }

    const contactInfo = {
        address: req.body.address, 
        location: req.body.location, 
        city: req.body.city,
        division: req.body.division, 
        phone: {
            number: req.body.phone,
            verificationCode: null,
            status: false
        }
    }

    try {
        const user = await User.findById(req.user.id);

        if(user.contact.phone.number==contactInfo.phone.number){
            contactInfo.phone.verificationCode = user.contact.phone.verificationCode
            contactInfo.phone.status = user.contact.phone.status
        }

        user.contact = contactInfo   
        await user.save()

        return res.status(200).send({
            msg: 'Contact information updated'
        });        
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route POST api/user/phone
// @description Send Code For Phone verification 
// @access Private
router.post('/phone', [auth], async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        user.contact.phone.verificationCode = generateRandomNumber()  
        user.contact.phone.date = Date.now()  
        await user.save()

        return res.status(200).send({
            msg: 'A verification code has been sent.'
        });        
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route POST api/user/phone/verify
// @description Verifing The Code
// @access Private
router.post('/phone/verify', [auth,
    [
        check('code', 'Verification code should not be empty.')
        .not()
        .isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
      return res.status(400).json({
        errors: error.array()
      })
    }

    try {
        const user = await User.findById(req.user.id);

        if(req.body.code!=user.contact.phone.verificationCode)
        {
            return res
                    .status(400)
                    .send({
                        error: [{
                            msg: 'Invalid verification code'
                        }]
                    });
        }
        user.contact.phone.verificationCode = null 
        user.contact.phone.status = true 
        user.contact.phone.date = Date.now()  
        await user.save()

        return res.status(200).send({
            msg: 'Your phone no is verified'
        });        
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router