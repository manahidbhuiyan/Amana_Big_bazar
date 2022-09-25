const express = require('express');
const router = express.Router();

const userAuth = require('../../../../middleware/user/auth');
const Notification = require('../../../../models/Notification');


// @route GET api/notification
// @description Get all notifications
// @access Private
router.get('/search/:branchID', userAuth, async (req, res) => {
    try {
        let condition = {}

        let columnName = "branch"
        let text = req.params.branchID

        condition = {
            [columnName]: {
                $in: text
            }
        }

        condition.status = true

        let notifications = await Notification.find(condition).select("-branch")


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

module.exports = router