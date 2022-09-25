const express = require('express');
const router = express.Router();

const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');
const Voucher = require('../../../../../models/Accounts/Settings/Voucher');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route PUT api/accounts/settings/voucher
// @description Update single voucher
// @access Private
router.put('/', [auth,
    [
        check('voucher', 'voucher id is required').not().isEmpty(),
        check('name', 'Subcategory name is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings voucher')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }
        
        const { name, voucher, active} = req.body

        const voucherName = await Voucher.findOne({
            name: name.toLowerCase(),
            _id: {
                $ne: voucher
            }
        })
        
        if (voucherName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'voucher name already exists'
                }
              ]
            })
        }

        let voucherInfo = await Voucher.findById(voucher)
        
        let slug = slugify(name)
        voucherInfo.name = name.toLowerCase().trim()
        voucherInfo.slug = slug.toLowerCase().trim()
        voucherInfo.admin = req.admin.id
        if(typeof active !== 'undefined'){
            voucherInfo.active = active
        }
        voucherInfo.update = Date.now()
     
        await voucherInfo.save()

        res.status(200).json({
            msg: 'group information updated successfully',
            data: voucherInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid group'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router