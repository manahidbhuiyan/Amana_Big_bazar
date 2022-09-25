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

// @route PUT api/accounts/settings/cost-center
// @description Update single cost center
// @access Private
router.put('/', [auth,
    [
        check('costcenter', 'costcenter id is required').not().isEmpty(),
        check('name', 'costcenter name is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

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
        
        const { name, costcenter, active} = req.body

        const categoryName = await CostCenter.findOne({
            name: name.toLowerCase(),
            _id: {
                $ne: costcenter
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

        let costcenterInfo = await CostCenter.findById(costcenter)
        
        let slug = slugify(name)
        costcenterInfo.name = name.toLowerCase().trim()
        costcenterInfo.slug = slug.toLowerCase().trim()
        costcenterInfo.admin = req.admin.id
        if(typeof active !== 'undefined'){
            costcenterInfo.active = active
        }
        costcenterInfo.update = Date.now()
     
        await costcenterInfo.save()

        res.status(200).json({
            msg: 'costcenter information updated successfully',
            data: costcenterInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid costcenter'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router