const express = require('express')
const router = express.Router()
const {
  check,
  validationResult
} = require('express-validator')
const {
  upload,
  removeNotvalidateFile
} = require('../../../lib/helpers')

// Load Middleware
const auth = require('../../../middleware/user/auth')

// Load User model
const User = require('../../../models/User')



// @route api/user/picture
// @description Add New Profile Picture
// @access Private
router.put('/picture', [auth, upload.single('file')], async (req, res) => {
  let validationMessage = '';
  const uploadedFileDetails = req.file
  if (uploadedFileDetails.mimetype === 'image/png' || uploadedFileDetails.mimetype === 'image/jpeg') {
    const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 256)
    if (filesize < 1) {
      try {
        let path = uploadedFileDetails.path.replace('public\\', './')
        let user = await User.findById(req.user.id)
        user.avatar = path.replace(/\\/g, "/")
        await user.save()
        return res.json(user)
      } catch (error) {
        console.error(error.message)
        return res.status(500).send('Server error')
      }
    } else {
      validationMessage = 'File should not be more than 256 KB.'
      removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
    }
  } else {
    validationMessage = 'Only png and jpg files are allowed.'
    removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
  }
})

// @route api/user/update
// @description User Information Update
// @access Private
router.put('/update', [auth,
  check('name', 'Name should not be empty')
  .not()
  .isEmpty(),
  check('email', 'Email should be in email format').isEmail(),
], async (req, res) => {
  const error = validationResult(req)

  if (!error.isEmpty()) {
    return res.status(200).json({
      errors: error.array(),
      success: false
    })
  }
  const {
    name,
    email,
    address,
    thana,
    district,
    division
  } = req.body

  try {
    let user = await User.findById(req.user.id).select('-password').select('-forgot')
    user.name = name
    user.email = email
    user.contact.address = address
    user.contact.thana = thana
    user.contact.district = district
    user.contact.division = division
    await user.save()

    return res.status(200).send({
      msg: 'Your information update successfully',
      success: true,
      info: user
    });

  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }

})

module.exports = router