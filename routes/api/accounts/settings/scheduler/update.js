const express = require('express');
const router = express.Router();

const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');
const SchedulerSettings = require('../../../../../models/Accounts/Settings/SchedulerSettings');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route PUT api/accounts/settings/scheduler-settings
// @description Update single scheduler-settings
// @access Private
router.put('/', [auth,
    [
        check('scheduler_settings', 'scheduler settings id is required').not().isEmpty(),
        // check('branch', 'branch is required').not().isEmpty(),
        check('product_receiving', 'product receiving info is required').not().isEmpty(),
        check('product_return', 'product return info is required').not().isEmpty(),
        check('product_disposal', 'product disposal info is required').not().isEmpty(),
        check('sell', 'sell info is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

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
        
        let { scheduler_settings, product_receiving, product_return, product_disposal, sell } = req.body

        // const schedulerInfo = await SchedulerSettings.findById(scheduler_settings)
        
        // if (schedulerInfo) {
        //     return res.status(400).send({
        //       errors: [
        //         {
        //           msg: 'scheduler settings already exists'
        //         }
        //       ]
        //     })
        // }
        
        // if(branch){
        //     branch = branch.trim()
        // }

        // const schedulerSettingsBranchName = await SchedulerSettings.findOne({
        //     branch: branch
        // })

        // if (schedulerSettingsBranchName) {
        //     return res.status(400).send({
        //       errors: [
        //         {
        //           msg: 'branch scheduler settings already exists'
        //         }
        //       ]
        //     })
        // }

        let schedulerSettingsInfo = await SchedulerSettings.findById(scheduler_settings)
        
        // schedulerSettingsInfo.branch = branch.trim()
        schedulerSettingsInfo.product_receiving = product_receiving
        schedulerSettingsInfo.product_return = product_return
        schedulerSettingsInfo.product_disposal = product_disposal
        schedulerSettingsInfo.sell = sell
        schedulerSettingsInfo.admin = req.admin.id

        schedulerSettingsInfo.update = Date.now()
     
        await schedulerSettingsInfo.save()

        res.status(200).json({
            msg: 'scheduler settings information updated successfully',
            data: schedulerSettingsInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid costcenter'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router