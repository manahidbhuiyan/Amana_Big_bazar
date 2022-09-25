const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const Menu = require('../../../../models/admin/Menu');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route DELETE api/order
// @description Remove Menu
// @access Private
router.delete('/:menuID', auth, async (req, res) => {
  try {
    //Check the admin menu permission from the lib/helpers
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'admin menu')
    
    //If admin menu is not permited
    if (!adminRoles) {
      return res.status(400).send({
        errors: [
          {
            msg: 'Account is not authorized to modify admin menu',
            type: 'error'
          }
        ]
      })
    }

    let menu = await Menu.findById(req.params.menuID)

    if (!menu) {
      return res.status(400).send({
        errors: [
          {
            msg: 'Menu remove request is invalid',
            type: 'error'
          }
        ]
      })
    }

    await menu.remove()

    res.status(200).json({
      type: 'success',
      msg: 'Menu removed successfully'
    });
  } catch (err) {
    if (err.kind === 'ObjectId') {
        return res.status(400).json({
            msg: 'Menu not found',
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