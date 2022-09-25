const express = require('express')
const router = express.Router()
const {check, validationResult} = require('express-validator')
// Load User Model
const User = require('../../../models/User')
// Load gravater
const gravater = require('gravatar')
// Load bcrypt
const bcrypt = require('bcryptjs')
// Load jwt
const jwt = require('jsonwebtoken')
// Load Config
const config = require('config')
// Load uuid 
const uuidv1 = require('uuid')

const {sendMessageTo} = require('../../../lib/helpers');

// @route POST api/users/register
// @description user phone no register
// @access Public
router.post(
  '/register',
  [
    check('phone', 'Phone no. should be in correct format').matches(/^[0][1][3-9]\d{8}$/, "i")
  ],
  async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
      return res.status(200).json({
        errors: error.array(),
        success: false
      })
    }

    const {phone} = req.body

    const verificationCode = Math.floor(100000 + Math.random() * 900000)

    try {
      // See if user exsist
      let user = await User.findOne({
        "phone.number": phone
      })

      if (user) {
        if(user.phone.status==true && user.name==null){
          return res.status(200).send({
              msg: 'your phone no is already verified',
              info: user,
              success: true,
              phone_verification: true
          });
        }
        if(user.phone.status==false && user.name==null){
          await user.remove()
        }else{
          return res.status(200).send({
            errors: [
              {
                msg: 'Phone no. already exists'
              }
            ],
            success: false
          })
        }
      }

      user = new User({
        "phone.number": phone,
        "phone.verificationCode": verificationCode
      })

      // Send Verification Code Message to phone 
      let msgText = "Your Amanabigbazar verification code is: " + verificationCode

      let responseInfo = await sendMessageTo(phone, msgText)

      if(responseInfo.statusCode == 200){
        await user.save()
          return res.status(200).send({
              msg: 'A verification code has been sent to your phone',
              info: user,
              success: true,
              phone_verification: false
          });
      }else{
        console.log(responseInfo)
        return res.status(200).send({
          errors: [
            {
              msg: "Verification code can't send. Try with correct contact no."
            }
          ],
          success: false
        })
      }
    } catch (err) {
      console.error(err.message)
      res.status(500).send('Server error')
    }
  }
)


// @route POST api/users/verify
// @description user phone number verification
// @access Public
router.put(
  '/verify',
  [
    check('userID', 'User id should not be empty').not().isEmpty(),
    check('code', 'Verification code should be 6 digit').matches(/^\d{6}$/, "i")
  ],
  async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
      return res.status(200).json({
        errors: error.array(),
        success: false
      })
    }

    const {userID, code} = req.body

    try {
      // See if user exsist
      let user = await User.findById(userID)

      if (user.length == 0) {
        return res.status(400).send({
          errors: [
            {
              msg: 'Your user id not exist.'
            }
          ],
          success: false
        }) 
      }


      if(user.phone.verificationCode == code){
        user.phone.verificationCode = null
        user.phone.status = true

        await user.save()

        return res.status(200).send({
            msg: 'Your phone no. is verified successfully',
            info: user,
            success: true
        });
      }else{
        return res.status(200).send({
          errors: [
            {
              msg: 'Verification code is not matched'
            }
          ]
        }) 
      }      
    } catch (err) {
      console.error(err.message)
      res.status(500).send('Server error')
    }
  }
)

// @route POST api/users/information
// @description User Registration
// @access Public
router.put(
  '/information',
  [
    check('userID', 'User id should not be empty').not().isEmpty(),
    check('name', 'Name should not be empty')
      .not()
      .isEmpty(),
    check('email', 'Email should be in email format').isEmail(),
    check('password', 'Password should be 6 or more characters').isLength({
      min: 6
    }),
    check('confirm_password', 'Passwords do not match').custom((value, {req}) => value == req.body.password)
  ],
  async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
      return res.status(200).json({
        errors: error.array(),
        success: false
      })
    }

    const {userID, name, email, password} = req.body

    const verify = uuidv1()
    try {
      // See if user exsist
      let user = await User.findById(userID)

      if (!user) {
        return res.status(200).send({
          errors: [
            {
              msg: 'User id is invalid',
              param: "userID"
            }
          ],
          success: false
        })
      }

      if(user.email == email){
        return res.status(200).send({
          errors: [
            {
              msg: 'Your email already exist',
              param: "email"
            }
          ],
          success: false
        })
      }

      if(!user.phone.status){
        return res.status(200).send({
          errors: [
            {
              msg: 'Your phone no is not verified yet',
              param: "verification"
            }
          ],
          success: true
        })
      }

      // Get user gravater
      const avatar = gravater.url(email, {
        s: '200',
        r: 'pg',
        d: 'mm'
      })

      user.name = name
      user.email = email.toLowerCase()
      user.avatar = avatar
      user.password = password
      user.verify.code = verify
      

      // Encrypt password
      const salt = await bcrypt.genSalt(10)

      user.password = await bcrypt.hash(password, salt)

      await user.save()

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id
        }
      }

      jwt.sign(
        payload,
        config.get('jwtSecrect'),
        {
          expiresIn: config.get('authTokenExpire')
        },
        (err, token) => {
          if (err) throw err
          res.json({
            token,
            success: true
          })
        }
      )
    } catch (err) {
      console.error(err.message)
      res.status(500).send('Server error')
    }
  }
)

module.exports = router