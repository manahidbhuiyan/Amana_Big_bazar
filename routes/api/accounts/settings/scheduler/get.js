const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');

const SchedulerSettings = require('../../../../../models/Accounts/Settings/SchedulerSettings');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route GET api/accounts/settings/scheduler-settings/:pageNo
// @description Get all the schedulersettings
// @access Private
router.get('/:pageNo', [auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            condition = {
                [columnName]: {
                    $regex: text,
                    $options: "i"
                }
            }
        }

        let schedulersettings = await SchedulerSettings.find(condition).populate('branch', 'name').limit(dataList).skip(offset)

        res.status(200).json({
            data: schedulersettings
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/scheduler-settings/scheduler-settings
// @description Get all the schedulersettings
// @access Private
router.get('/', [auth], async (req, res) => {
    try {
        let condition = {
            active: true
        }

        let schedulersettings = await SchedulerSettings.find(condition).select('_id').select('name')

        res.status(200).json({
            data: schedulersettings
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/accounts/settings/scheduler-settings/data/:categoryID
// @description Get single scheduler settings
// @access Private
router.get('/data/:schedulersettingsID', [auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }

        let schedulersettings = await SchedulerSettings.findById(req.params.schedulersettingsID).populate('branch', 'name')

        res.status(200).json({
            data: schedulersettings
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid category'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router