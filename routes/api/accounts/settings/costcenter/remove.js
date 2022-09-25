const express = require('express');
const router = express.Router();

const auth = require('../../../../../middleware/admin/auth');
const CostCenter = require('../../../../../models/Accounts/Settings/CostCenter');
const GeneralJournalDetails = require('../../../../../models/Accounts/GeneralJournalDetails');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route DELETE api/accounts/settings/cost-center
// @description Remove Specific cost center
// @access Private
router.delete('/:costcenterID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings costcenter')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }

        let costcenterName = await GeneralJournalDetails.find({
            costcenter: req.params.costcenterID
        })

        if (costcenterName.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'cost center is already used in subcategory'
                    }
                ]
            })
        }

        // See if category exsist
        let costcenter = await CostCenter.findById(req.params.costcenterID)

        if(!costcenter){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid costcenter remove request'
                  }
                ]
              })
        }

        await costcenter.remove()

        res.status(200).json({
            msg: 'costcenter removed successfully'
        });
    } catch (err) {
      if (err.kind === 'ObjectId') {
          return res.status(400).json({
              msg: 'costcenter not found'
          });
      }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router