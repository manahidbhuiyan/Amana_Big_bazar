const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

//Load admin authentication middleware
const auth = require('../../../../middleware/admin/auth');
// Load Notification model 
const Notification = require('../../../../models/Notification');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route POST api/role
// @description Add New Role
// @access Private - this api can be accessed by the admin who have role permission
router.post('/', [auth,
    [
        check('email', 'Email address required').not().isEmpty(),
        check('notificationType', 'Notification type required').not().isEmpty()
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        //Check the role permission from the lib/helpers
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'notification')

        //If role is not permited
        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to modify notification',
                    type: 'error'
                }]
            })
        }

        const {
            branch,
            email,
            notificationType
        } = req.body

        const addNotificationInfo = new Notification({
            branch: branch,
            email: email,
            type: 'email',
            notificationType: notificationType,
            status: true
        })

        await addNotificationInfo.save()

        res.status(200).json({
            type: 'success',
            msg: 'New Notification email added successfully',
            data: addNotificationInfo
        })
    } catch (err) {
        res.status(500).send({
            msg: 'Server error',
            type: 'error'
        });
    }
});

module.exports = router