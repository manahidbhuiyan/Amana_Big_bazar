const express = require('express')
const router = express.Router()
// Load jwt
const jwt = require('jsonwebtoken')
// Load Config 
const config = require('config')
// Load User Model
const User = require('../../../../models/User')
// Load Express Validator
const {
  check,
  validationResult
} = require('express-validator')
// Load uuidv1
const uuidv1 = require('uuid')

const {sendMessageTo} = require('../../../../lib/helpers');

// @route Post api/user/password/forgot
// @description Reset new paasword
// @access Private
router.post('/forgot', [
  check('phone', 'Phone no. should be in correct format').matches(/^[0][1][3-9]\d{8}$/, "i")
], async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.status(200).json({
      errors: error.array(),
      success: false
    })
  }

  const {
    phone
  } = req.body

  const verificationCode = Math.floor(1000 + Math.random() * 9000)

  try {
    let user = await User.findOne({
      'phone.number': phone
    })

    if (!user) {
      return res.status(200).json({
        errors: [{
          msg: 'Your phone no. is not exist',
          param: "auth"
        }],
        success: false
      });
    }

    if (user.phone.status != true) {
      return res.status(200).json({
        errors: [{
          msg: 'Your phone is not varified yet',
          param: "phone"
        }],
        success: false
      });
    }

    user.forgot = {
      code: verificationCode,
      status: true,
      date: Date.now()
    }

    // Send Verification Code Message to phone 
    let msgText = "Your Amanabigbazar verification code is: " + verificationCode

    let responseInfo = await sendMessageTo(phone, msgText)

    if(responseInfo.statusCode == 200){
        await user.save()

        res.status(200).json({
          success: "Password reset code has been sent",
          info: user,
          success: true
        });
    }else{
      console.log(responseInfo.message)
        return res.status(200).send({
          errors: [{
            msg: "Verification code can't send. Try with correct contact no."
          }],
          success: false
        })
    }
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Server error')
  }
})


// @route POST api/user/forgot/password/verify
// @description user phone number verification
// @access Public
router.put(
  '/forgot/password/verify',
  [
    check('userID', 'User id should not be empty').not().isEmpty(),
    check('code', 'Verification code should be 4 digit').matches(/^\d{4}$/, "i")
  ],
  async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
      return res.status(200).json({
        errors: error.array(),
        success: false
      })
    }

    const {
      userID,
      code
    } = req.body

    try {
      // See if user exsist
      let user = await User.findById(userID)

      if (user.length == 0) {
        return res.status(200).send({
          errors: [{
            msg: 'Your user id not exist',
            param: 'auth'
          }],
          success: false
        })
      }


      if (user.forgot.code == code) {
        await user.save()

        return res.status(200).send({
          msg: 'Your phone no. is verified successfully',
          info: user,
          success: true
        });
      } else {
        return res.status(200).send({
          errors: [{
            msg: 'Verification code is not matched',
            param: 'code'
          }],
          success: false
        })
      }
    } catch (err) {
      console.error(err.message)
      res.status(500).send('Server error')
    }
  }
)

module.exports = router