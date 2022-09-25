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

// @route POST api/accounts/settings/currency
// @description Add new currency
// @access Private
router.post('/', [auth, 
    [
        check('name', 'currency name required').not().isEmpty()
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        const { name, converted_to, conversion_rate } = req.body

        const currencyRate = await Currency.findOne({
            name: name.toLowerCase()
        })

        if (currencyRate) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'currency name already exists'
                }
              ]
            })
        }

        let serialNo = 100

            const lastSerialInfo = await Currency.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
        
        let slug = slugify(name)

        const addcategoryInfo = new Currency({
            serialNo,
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim(),
            converted_to,
            conversion_rate,
            admin: req.admin.id
        })

        await addcategoryInfo.save()
        res.status(200).json({
            msg: 'new currency added successfully',
            data: addcategoryInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router