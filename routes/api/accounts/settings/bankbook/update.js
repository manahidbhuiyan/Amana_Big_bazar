const express = require('express');
const router = express.Router();

const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');
const BankBook = require('../../../../../models/Accounts/Settings/BankBook');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route PUT api/accounts/settings/bankbook
// @description Update single bankbook
// @access Private
router.put('/', [auth,
    [
        check('bankbook', 'bankbook id is required').not().isEmpty(),
        check('account_no', 'account no is required').not().isEmpty(),
        check('address', 'address is required').not().isEmpty(),
        check('name', 'category name required').not().isEmpty(),
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings bankbook')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }
        
        const { name, account_no, address, bankbook, active} = req.body

        const categoryName = await BankBook.findOne({
            name: name.toLowerCase(),
            _id: {
                $ne: bankbook
            }
        })
        
        if (categoryName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'category name already exists'
                }
              ]
            })
        }

        let bankbookInfo = await BankBook.findById(bankbook)
        
        let slug = slugify(name)
        bankbookInfo.account_no = account_no
        bankbookInfo.address = address
        bankbookInfo.name = name.toLowerCase().trim()
        bankbookInfo.slug = slug.toLowerCase().trim()
        bankbookInfo.admin = req.admin.id
        if(typeof active !== 'undefined'){
            bankbookInfo.active = active
        }
        bankbookInfo.update = Date.now()
     
        await bankbookInfo.save()

        res.status(200).json({
            msg: 'bankbook information updated successfully',
            data: bankbookInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid bankbook'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router