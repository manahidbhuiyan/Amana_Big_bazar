const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const Permission = require('../../../../models/admin/Permission');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route DELETE api/order
// @description Remove Permission
// @access Private
router.delete('/:permissionID', auth, async (req, res) => {
  try {
    //Check the admin permission from the lib/helpers
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'admin permission')
    
    //If admin permission is not permited
    if (!adminRoles) {
      return res.status(400).send({
        errors: [
          {
            msg: 'Account is not authorized to modify admin permission',
            type: 'error'
          }
        ]
      })
    }

    let permission = await Permission.findById(req.params.permissionID)

    if (!permission) {
      return res.status(400).send({
        errors: [
          {
            msg: 'Permission remove request is invalid',
            type: 'error'
          }
        ]
      })
    }

    await permission.remove()

    res.status(200).json({
      type: 'success',
      msg: 'Permission removed successfully'
    });
  } catch (err) {
    if (err.kind === 'ObjectId') {
        return res.status(400).json({
            msg: 'Permission not found',
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