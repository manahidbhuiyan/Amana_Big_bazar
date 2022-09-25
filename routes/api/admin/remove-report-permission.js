const express = require('express')
const router = express.Router()

// Load Middleware
const auth = require('../../../middleware/admin/auth');
const Admin = require('../../../models/admin/Admin');
const Role = require('../../../models/admin/Role');

// Load User model



// @route api/user/update
// @description User Information Update
// @access Private
router.post('/remove-report-permission', auth, async (req, res) => {

  try {
    console.log('inside remove report API')
    let role = await Role.findOne({
      name: "report"  
    }).select("_id")

    let adminOfBranch = await Admin.find({
      branches: {
          $in: req.query.branch
      },
      roles:{
        $in: role
      }
    }).select("_id name roles")


    let loopArray = adminOfBranch.map( async (adminInfo, index) => {
      adminInfo.roles.pull(role._id)
      await adminInfo.save()
    })
    await Promise.all(loopArray)
    return res.status(200).send({
      msg: 'Report Permission Remove successfully',
      success: true
    });

  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }

})

module.exports = router