const express = require('express');
const router = express.Router();

const auth = require('../../../../../middleware/admin/auth');
const Group = require('../../../../../models/Accounts/Chart/Group');
const SubGroup = require('../../../../../models/Accounts/Chart/SubGroup');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route DELETE api/accounts/chart/subgroup
// @description Remove Specific subgroup
// @access Private
router.delete('/:groupID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'chart of accounts group')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to chart of accounts'
                    }
                ]
            })
        }

        let subgroup = await SubGroup.find({
            group: req.params.groupID
        })

        if (subgroup.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'group is already used in subgroup'
                    }
                ]
            })
        }

        // See if group exsist
        let group = await Group.findById(req.params.groupID)

        if(!group){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid group remove request'
                  }
                ]
              })
        }

        await group.remove()

        res.status(200).json({
            msg: 'group removed successfully'
        });
    } catch (err) {
      if (err.kind === 'ObjectId') {
          return res.status(400).json({
              msg: 'group not found'
          });
      }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router