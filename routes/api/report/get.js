const express = require('express');
const router = express.Router();

const config = require('config')

const OrderForPos = require('../../../models/OrderForPos');

const auth = require('../../../middleware/user/auth');
const adminAuth = require('../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

const Admin = require('../../../models/admin/Admin');

// @route GET api/order
// @description Get all the orders
// @access Private
router.get('/list/:pageNo', [adminAuth], async (req, res) => {

    try {

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let branch = req.query.branch

        let condition = {
            branch
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'order_phone') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else if (columnName == 'order_status') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else {
                condition = {
                    [columnName]: parseInt(text),
                    branch
                }
            }

        }

        let order = await OrderForPos.find(condition).populate('branch', ['name']).limit(dataList).skip(offset).sort({
            "_id": -1
        })


        res.status(200).json({
            data: order
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/view/:id', [adminAuth], async (req, res) => {
    try {
        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let order = await OrderForPos.findOne({
            _id: req.params.id,
            branch: req.query.branch
        })
        res.status(200).json({
            data: order
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router