const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');
const CostCenter = require('../../../../../models/Accounts/Settings/CostCenter');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route POST api/accounts/settings/cost-center
// @description Add new cost center
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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings costcenter')

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

        const costCenterName = await CostCenter.findOne({
            name: name.toLowerCase()
        })

        if (costCenterName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'cost center name already exists'
                }
              ]
            })
        }

        let serialNo = 100

            const lastSerialInfo = await CostCenter.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
        
        let slug = slugify(name)

        const costCenterInfo = new CostCenter({
            serialNo,
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim(),
            admin: req.admin.id
        })

        await costCenterInfo.save()
        res.status(200).json({
            msg: 'new cost center added successfully',
            data: costCenterInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router