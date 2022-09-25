const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const Notification = require('../../../../models/Notification');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route GET api/notification
// @description Get all notifications
// @access Public
router.get('/list/:pageNo', auth, async (req, res) => {
    try {

        let dataList = 25
        let offset = (parseInt(req.params.pageNo) - 1) * dataList

        let condition = {}

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'branch') {
                let branchID = []
                const branch = await Branch.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                branch.map(value => branchID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: branchID
                    }
                }
            } else {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    }
                }
            }
        }

        condition.type = 'phone'

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'notification')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to modify notification',
                    type: 'error'
                }]
            })
        }

        let notifications = await Notification.find(condition).populate({
            path: 'branch',
            select: 'name'
        }).limit(dataList).skip(offset)

        res.status(200).json({
            data: notifications,
            type: 'success'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({
            msg: 'Server error',
            type: 'error'
        });
    }
});

// @route GET api/notification/:roleID
// @description Get Single notifications
// @access Public
router.get('/:notificationID', auth, async (req, res) => {
    try {
        let notifications = await Notification.findById(req.params.notificationID).populate({
            path: 'branch',
            select: 'name'
        })

        res.status(200).json({
            data: notifications,
            type: 'success'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'Record not found',
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