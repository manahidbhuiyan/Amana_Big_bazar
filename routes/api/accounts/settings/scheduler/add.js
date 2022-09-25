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

// @route POST api/accounts/settings/scheduler-settings
// @description Add new schedulersettings
// @access Private
router.post('/', [auth, 
    [
        // check('branch', 'branch is required').not().isEmpty(),
        check('product_receiving', 'product receiving info is required').not().isEmpty(),
        check('product_return', 'product return info is required').not().isEmpty(),
        check('product_disposal', 'product disposal info is required').not().isEmpty(),
        check('sell', 'sell info is required').not().isEmpty()
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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


        let { branch, product_receiving, product_return, product_disposal, sell } = req.body

        if(branch){
            branch = branch.trim()
        }
        
        const schedulerSettingsBranchName = await SchedulerSettings.findOne({
            branch: branch
        })

        if (schedulerSettingsBranchName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'branch scheduler settings already exists'
                }
              ]
            })
        }

        let serialNo = 100

            const lastSerialInfo = await SchedulerSettings.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }

        const schedulerSettingsInfo = new SchedulerSettings({
            serialNo,
            branch,
            product_receiving,
            product_return,
            product_disposal,
            sell,
            admin: req.admin.id
        })

        await schedulerSettingsInfo.save()
        res.status(200).json({
            msg: 'accounts scheduler settings is added successfully',
            data: schedulerSettingsInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router