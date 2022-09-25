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

// @route POST api/accounts/settings/voucher
// @description Add new voucher
// @access Private
router.post('/', [auth, 
    [
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

        const { name } = req.body

        const vocherName = await Voucher.findOne({
            name: name.toLowerCase()
        })

        if (vocherName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'voucher name already exists'
                }
              ]
            })
        }

        let serialNo = 100

            const lastSerialInfo = await Voucher.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
        
        let slug = slugify(name)

        const addvoucherInfo = new Voucher({
            serialNo,
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim(),
            admin: req.admin.id
        })

        await addvoucherInfo.save()
        res.status(200).json({
            msg: 'new voucher added successfully',
            data: addvoucherInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router