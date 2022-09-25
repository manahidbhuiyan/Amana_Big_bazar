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

// @route PUT api/billing/service
// @description Update Billing Service
// @access Private
router.put('/', [auth,
    [
        check('serviceID', 'service id required').not().isEmpty(),
        check('name', 'service name required').not().isEmpty(),
        check('cost', 'service cost required').not().isEmpty(),
        check('service_duration', 'service duration days required').not().isEmpty(),
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

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
        
        const { serviceID, name, cost, service_duration } = req.body

        let billingServiceInfo = await BillingService.findById(serviceID)

        if(billingServiceInfo.name !=  name.toLowerCase())
        {
            const billingServiceName = await BillingService.findOne({
                name: name.toLowerCase()
            })
            
            if (billingServiceName) {
                return res.status(400).send({
                  errors: [
                    {
                      msg: 'billing service name already exists'
                    }
                  ]
                })
            }
        }
        
        let slug = slugify(name)
        billingServiceInfo.name = name.toLowerCase().trim()
        billingServiceInfo.slug = slug.toLowerCase().trim()
        billingServiceInfo.cost = cost
        billingServiceInfo.serviceDuration = service_duration
        billingServiceInfo.update = Date.now()
    
        await billingServiceInfo.save()
        res.status(200).json({
            msg: 'service information updated successfully',
            data: billingServiceInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid subcategory'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router