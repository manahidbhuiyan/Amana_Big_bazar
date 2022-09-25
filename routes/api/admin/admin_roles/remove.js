const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const AdminRole = require('../../../../models/admin/AdminRole');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route DELETE api/order
// @description Remove Role
// @access Private
router.delete('/:adminRoleID', auth, async (req, res) => {
  try {
    // //Check the role permission from the lib/helpers
    // const adminRoles = await getAdminRoleChecking(req.admin.id, 'role')
    
    // //If role is not permited
    // if (!adminRoles) {
    //   return res.status(400).send({
    //     errors: [
    //       {
    //         msg: 'Account is not authorized to modify role',
    //         type: 'error'
    //       }
    //     ]
    //   })
    // }

    let adminRole = await AdminRole.findById(req.params.adminRoleID)

    if (!adminRole) {
      return res.status(400).send({
        errors: [
          {
            msg: 'Admin role remove request is invalid',
            type: 'error'
          }
        ]
      })
    }

    await adminRole.remove()

    res.status(200).json({
      type: 'success',
      msg: 'Admin role removed successfully'
    });
  } catch (err) {
    if (err.kind === 'ObjectId') {
        return res.status(400).json({
            msg: 'Admin role not found',
            type: 'error'
        });
    }
    console.error(err);
    res.status(500).send({
      msg: 'Server error',
      type: 'error'
    });
  }
});

module.exports = router