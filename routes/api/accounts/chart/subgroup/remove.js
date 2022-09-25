const express = require('express');
const router = express.Router();

const auth = require('../../../../../middleware/admin/auth');
const Category = require('../../../../../models/Accounts/Chart/Category');
const SubGroup = require('../../../../../models/Accounts/Chart/SubGroup');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route DELETE api/accounts/chart/subgroup
// @description Remove Specific subgroup
// @access Private
router.delete('/:subgroupID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'chart of accounts subgroup')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to chart of accounts'
                    }
                ]
            })
        }

        let category = await Category.find({
            subgroup: req.params.subgroupID
        })

        if (category.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'subgroup is already used in category'
                    }
                ]
            })
        }

        // See if subgroup exsist
        let subgroup = await SubGroup.findById(req.params.subgroupID)

        if(!subgroup){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid subgroup remove request'
                  }
                ]
              })
        }

        await subgroup.remove()

        res.status(200).json({
            msg: 'subgroup removed successfully'
        });
    } catch (err) {
      if (err.kind === 'ObjectId') {
          return res.status(400).json({
              msg: 'subgroup not found'
          });
      }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router