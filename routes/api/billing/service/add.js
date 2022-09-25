const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const BillingService = require('../../../../models/Billing/Service');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route POST api/billing/service
// @description Add new Billing Service
// @access Private
router.post('/', [auth, 
    [
        check('name', 'service name required').not().isEmpty(),
        check('cost', 'service cost required').not().isEmpty(),
        check('service_duration', 'service duration days required').not().isEmpty(),
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        const { name, cost, service_duration } = req.body

        const billingServiceName = await BillingService.findOne({
            name: name.toLowerCase()
        })

        if (billingServiceName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'Billing service name already exists'
                }
              ]
            })
        }

        let serialNo = 100

            const lastSerialInfo = await BillingService.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
        
        let slug = slugify(name)

        const billingServiceInfo = new BillingService({
            serialNo,
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim(),
            cost,
            serviceDuration: service_duration
        })

        await billingServiceInfo.save()
        res.status(200).json({
            msg: 'New billing service added successfully',
            data: billingServiceInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router