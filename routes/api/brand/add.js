const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const BrandName = require('../../../models/BrandName');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route POST api/brand
// @description Add new brand
// @access Private
router.post('/', [auth,
    [
        check('branch', 'Branch is required').not().isEmpty(),
        check('category', 'Category id required').not().isEmpty(),
        check('subcategory', 'Sub category id required').not().isEmpty(),
        check('name', 'Subcategory name required').not().isEmpty()
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'brand')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to brand'
                }]
            })
        }

        const {
            branch,
            category,
            subcategory,
            name
        } = req.body

        const brandName = await BrandName.findOne({
            name
        })

        if (brandName) {
            return res.status(400).send({
                errors: [{
                    msg: 'Brand name already exists'
                }]
            })
        }

        let serialNo = 1000

        const lastSerialInfo = await BrandName.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
   

        let slug = slugify(name)
        const addBrandNameInfo = new BrandName({
            serialNo,
            branch,
            category,
            subcategory,
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim()
        })

        await addBrandNameInfo.save()
        
        res.status(200).json({
            msg: 'New brand name added successfully',
            data: addBrandNameInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router