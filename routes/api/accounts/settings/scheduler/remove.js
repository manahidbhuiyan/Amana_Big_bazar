const express = require('express');
const router = express.Router();

const auth = require('../../../../../middleware/admin/auth');
const SchedulerSettings = require('../../../../../models/Accounts/Settings/SchedulerSettings');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route DELETE api/accounts/settings/scheduler-settings
// @description Remove Specific cost center
// @access Private
router.delete('/:schedulersettingsID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings scheduler')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }

        // See if category exsist
        let schedulerSettings = await SchedulerSettings.findById(req.params.schedulersettingsID)

        if(!schedulerSettings){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid scheduler settings remove request'
                  }
                ]
              })
        }

        await schedulerSettings.remove()

        res.status(200).json({
            msg: 'scheduler settings removed successfully'
        });
    } catch (err) {
      if (err.kind === 'ObjectId') {
          return res.status(400).json({
              msg: 'scheduler settings not found'
          });
      }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router