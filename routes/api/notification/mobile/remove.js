const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
// Load Notification model 
const Notification = require('../../../../models/Notification');

const {
  getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route DELETE api/order
// @description Remove Role
// @access Private
router.delete('/:notificationID', auth, async (req, res) => {
  try {
    //Check the notification permission from the lib/helpers
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'notification')

    //If notification is not permited
    if (!adminRoles) {
      return res.status(400).send({
        errors: [{
          msg: 'Account is not authorized to modify notification',
          type: 'error'
        }]
      })
    }

    let notification = await Notification.findById(req.params.notificationID)

    if (!notification) {
      return res.status(400).send({
        errors: [{
          msg: 'Notification phone no remove request is invalid',
          type: 'error'
        }]
      })
    }

    await notification.remove()

    res.status(200).json({
      type: 'success',
      msg: 'Notification phone no removed successfully'
    });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(400).json({
        msg: 'Notification phone no not found',
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