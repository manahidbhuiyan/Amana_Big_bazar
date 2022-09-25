const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const BillingService = require('../../../../models/Billing/Service');
const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route GET api/billing/service/:pageNo
// @description billing sevice by pagination
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
            let columnName = req.query.type
            let text = req.query.text

            condition = {
                [columnName]: {
                    $regex: text,
                    $options: "i"
                }
            }
        }

        let billingSevices = await BillingService.find(condition).limit(dataList).skip(offset)

        res.status(200).json({
            data: billingSevices
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/billing/service
// @description Get all the services
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

        let billingServices = await BillingService.find().select('_id name cost serviceDuration')

        res.status(200).json({
            data: billingServices
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/billing/service/single/:serviceID
// @description specific service details
// @access Private
router.get('/single/:serviceID', auth, async (req, res) => {
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

        let serviceID = req.params.serviceID

        let condition = {
            _id: serviceID
        }

        let billingService = await BillingService.findOne(condition).select('_id name cost serviceDuration')

        res.status(200).json({
            data: billingService
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router