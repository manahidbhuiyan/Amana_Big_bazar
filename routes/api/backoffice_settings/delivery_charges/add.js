const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const DeliveryCharges = require('../../../../models/DeliveryCharges');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route POST api/branch
// @description Add New Delivery Charges or Shop Location
// @access Private
router.post('/', [auth,
    [
        check('thana', 'Thana is required').not().isEmpty(),
        check('district', 'District is required').not().isEmpty(),
        check('division', 'Division is required').not().isEmpty(),
        check('branch', 'Branch is required').not().isEmpty(),
        check('min_amount', 'Min amount is required').not().isEmpty(),
        check('max_amount', 'Max amount is required').not().isEmpty(),
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'backoffice settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to backoffice settings'
                }]
            })
        }

        const {
            thana,
            district,
            division,
            branch,
            notes,
            min_amount,
            max_amount,
        } = req.body

        if (+min_amount > +max_amount) {
            return res.status(400).send({
                errors: [{
                    msg: 'Min amount should not be gratter than Max amount'
                }]
            })
        }

        const deliveryChargeInfo = await DeliveryCharges.findOne({
            branch,
            thana,
            district,
            division,
        })

        if (deliveryChargeInfo) {
            return res.status(400).send({
                errors: [{
                    msg: 'Delivery charge info of this branch already exists'
                }]
            })
        }

        let serialNo = 100

        const lastSerialInfo = await DeliveryCharges.findOne().sort({create: -1})

        if(lastSerialInfo){
            serialNo = lastSerialInfo.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }

        const addDeliveryChargeInfo = new DeliveryCharges({
            serialNo,
            admin: req.admin.id,
            thana,
            district,
            branch,
            division,
            minimum: +min_amount,
            maximum: +max_amount,
            notes
        })

        await addDeliveryChargeInfo.save()
        res.status(200).json({
            msg: 'New delivery charge info added successfully',
            data: addDeliveryChargeInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router