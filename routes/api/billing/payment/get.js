const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const BillingPayment = require('../../../../models/Billing/Payment');
const Branch = require('../../../../models/Branch');
const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route GET api/billing/payment/:pageNo
// @description billing payment by pagination
// @access Private
router.get('/:pageNo', auth, async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'billing')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to billing'
                    }
                ]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}

        if (req.query.text !== undefined) {
            let text = req.query.text
            let columnName = req.query.type
            const branch = await Branch.findOne({
                name: {
                    $regex: text,
                    $options: "i"
                }
            }).select('id')
            
            condition = {
                [columnName]: branch.id
            }
        }

        let billingPayments = await BillingPayment.find(condition).limit(dataList).skip(offset).populate('branch')

        res.status(200).json({
            data: billingPayments
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/billing/service
// @description Get all the billing payment
// @access Private
router.get('/', auth, async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'billing')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to billing'
                    }
                ]
            })
        }

        let billingPayments = await BillingPayment.find().populate('branch')

        res.status(200).json({
            data: billingPayments
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/billing/payment/single/:paymentID
// @description specific payment details
// @access Private
router.get('/single/:paymentID', auth, async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'billing')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to billing'
                    }
                ]
            })
        }

        let paymentID = req.params.paymentID

        let condition = {
            _id: paymentID
        }

        let billingPayment = await BillingPayment.findOne(condition).populate('branch')

        res.status(200).json({
            data: billingPayment
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/billing/payment/single/:paymentID
// @description specific payment details
// @access Private
router.get('/branch-last-payment/:branchID', auth, async (req, res) => {
    try {
        let branchID = req.params.branchID

        let condition = {
            branch: branchID
        }

        let billingPayment = await BillingPayment.findOne(condition).sort({
            "_id": -1
        })

        res.status(200).json({
            data: billingPayment
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router