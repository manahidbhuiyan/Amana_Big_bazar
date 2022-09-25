const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
// Load Notification model 
const Notification = require('../../../../models/Notification');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');
// @route PUT api/notification/email
// @description Update notification
// @access Private
router.put('/', [auth,
    [
        check('notificationID', 'Notification id is required').not().isEmpty(),
        check('phone', 'Phone no required').not().isEmpty(),
        check('notificationType', 'Notification type required').not().isEmpty()
    ]
], async (req, res) => {
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

    try {
        const {
            notificationID,
            branch,
            phone,
            notificationType
        } = req.body

        let notification = await Notification.findById(notificationID)

        notification.branch = branch
        notification.phone = phone
        notification.notificationType = notificationType
        notification.update = Date.now()

        await notification.save()
        res.status(200).json({
            type: 'success',
            msg: 'Notification phone number updated successfully',
            data: notification
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'Notification phone number not found',
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