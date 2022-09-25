const express = require('express')
const router = express.Router()
const {check, validationResult} = require('express-validator')
// Load Admin Model
const Admin = require('../../../models/admin/Admin')
// Load gravater
const gravater = require('gravatar')
// Load bcrypt
const bcrypt = require('bcryptjs')
// Load Config
const config = require('config')
// Load uuid 
const uuidv1 = require('uuid')

const auth = require('../../../middleware/admin/auth');

const { getAdminRoleChecking } = require('../../../lib/helpers');
const sendEmail = require('../../../lib/email/sendEmailModule');

// @route POST api/admin
// @description Admin Registration
// @access Public
router.post(
  '/', [
    auth, 
    [
      check('name', 'Name should not be empty.')
        .not()
        .isEmpty(),
      check('email', 'Email should be in email format.').isEmail(),
      check('admin_roles_id', 'Admin role id should not be empty.').not().isEmpty(),
      check('admin_roles', 'Admin role should not be empty.').not().isEmpty(),
      check('password', 'Password should be 6 or more characters.').isLength({
        min: 6
      })
    ]
  ],
  async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
      return res.status(400).json({
        errors: error.array()
      })
    }

    //Check the role permission from the lib/helpers
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'admin')

    //If role is not permited
    if (!adminRoles) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Account is not authorized to create admin'
                }
            ]
        })
    }

    

    const {name, email, password, admin_roles_id, admin_roles, sdcDeviceInfo} = req.body

    let superAdmin = req.body.superAdmin
    if(typeof(req.body.superAdmin) == 'undefined'){
        superAdmin = false
    }

    if(superAdmin == true && req.adminInfo.superAdmin != true){
      return res.status(400).send({
        errors: [
            {
                msg: 'only super admin can create or update a super admin account'
            }
        ]
      })
    }

    let activeAccount = req.body.active
    if(typeof(req.body.active) == 'undefined'){
      activeAccount = true
    }

    const verify = uuidv1()
    try {
      // See if admin exsist
      let admin = await Admin.findOne({
        email
      })

      if (admin) {
        return res.status(400).send({
          errors: [
            {
              msg: 'Admin already exists'
            }
          ]
        })
      }

      // Get admin gravater
      const avatar = gravater.url(email, {
        s: '200',
        r: 'pg',
        d: 'mm'
      })

      let branches = []

      sdcDeviceInfo.map(branchInfo=>{
        branches.push(branchInfo.branchID)
      })

      admin = new Admin({
        name: name.toLowerCase(),
        email: email.toLowerCase(),
        avatar,
        branches,
        password,
        admin_roles_id,
        admin_roles,
        superAdmin,
        "verify.code": verify,
        active: activeAccount,
        sdcDeviceInfo
      })

      // Encrypt password
      const salt = await bcrypt.genSalt(10)

      admin.password = await bcrypt.hash(password, salt)

      await admin.save()

      const templateDetails = {
          folder: "verify",
          filename: "index.ejs",
          data:{
              code: verify,
              host:  config.get('hostname'),
              resetLink: '/api/admin/verify/',
              companyname: 'Amana Homes',
              supportEmail: 'support@amanahomes.com',
              button:{
                  text: 'Verify'
              },
              user:{
                  name: admin.name
              }
          }
      }

      const emailOptions = {
          from: 'no-reply@amanahomes.com',
          to: admin.email,
          subject: 'Verify your email'
      }

      sendEmail(templateDetails, null, null, emailOptions)

      if(superAdmin){
        return res.status(200).json({
            msg: 'Super admin registered successfully'
        })  
      }

      return res.status(200).json({
          msg: 'Admin registered successfully'
      })

    } catch (err) {
      console.error(err.message)
      res.status(500).send('Server error')
    }
  }
)

module.exports = router