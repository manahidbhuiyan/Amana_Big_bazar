const express = require('express');
const router = express.Router();

const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');
const Currency = require('../../../../../models/Accounts/Settings/Currency');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route PUT api/accounts/settings/currency
// @description Update single category
// @access Private
router.put('/', [auth,
    [
        check('currency', 'currency id is required').not().isEmpty(),
        check('name', 'category name required').not().isEmpty(),
        check('converted_to', 'conversion currency is required').not().isEmpty(),
        check('conversion_rate', 'conversion rate is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings currency')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }
        
        const { name, currency, converted_to, conversion_rate, active} = req.body

        const currencyName = await Currency.findOne({
            name: name.toLowerCase(),
            _id: {
                $ne: currency
            }
        })
        
        if (currencyName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'category name already exists'
                }
              ]
            })
        }

        let currencyInfo = await Currency.findById(currency)
        
        let slug = slugify(name)
        currencyInfo.converted_to = converted_to
        currencyInfo.conversion_rate = conversion_rate
        currencyInfo.name = name.toLowerCase().trim()
        currencyInfo.slug = slug.toLowerCase().trim()
        currencyInfo.admin = req.admin.id
        if(typeof active !== 'undefined'){
            currencyInfo.active = active
        }
        currencyInfo.update = Date.now()
     
        await currencyInfo.save()

        res.status(200).json({
            msg: 'currency information updated successfully',
            data: currencyInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid currency'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router