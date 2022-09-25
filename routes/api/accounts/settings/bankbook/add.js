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

// @route POST api/accounts/settings/bankbook
// @description Add new bankbook
// @access Private
router.post('/', [auth, 
    [
        check('account_no', 'account no is required').not().isEmpty(),
        check('address', 'address is required').not().isEmpty(),
        check('name', 'category name required').not().isEmpty()
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        const { name, account_no, address } = req.body

        const bankBookName = await BankBook.findOne({
            name: name.toLowerCase()
        })

        if (bankBookName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'bankbook name already exists'
                }
              ]
            })
        }

        let serialNo = 100

            const lastSerialInfo = await BankBook.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
        
        let slug = slugify(name)

        const bankBookInfo = new BankBook({
            account_no,
            address,
            serialNo,
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim(),
            admin: req.admin.id
        })

        await bankBookInfo.save()
        res.status(200).json({
            msg: 'new bankbook added successfully',
            data: bankBookInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router