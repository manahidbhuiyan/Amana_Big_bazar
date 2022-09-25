const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const SubCategory = require('../../../models/SubCategory');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route POST api/brand
// @description Add new brand
// @access Private
router.post('/', [auth, 
    [
        check('branch', 'Branch is required').not().isEmpty(),
        check('category', 'Category is required').not().isEmpty(),
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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'subcategory')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to subcategory'
                    }
                ]
            })
        }

        const { branch, category, name, isSizeAvailable, isWeightAvailable } = req.body

        const subcategoryName = await SubCategory.findOne({
            name
        })

        if (subcategoryName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'Subcategory name already exists'
                }
              ]
            })
        }

        let serialNo = 100

            const lastSerialInfo = await SubCategory.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
        
        let slug = slugify(name)

        const addSubcategoryInfo = new SubCategory({
            serialNo,
            branch,
            category,
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim(),
            isSizeAvailable,
            isWeightAvailable
        })

        await addSubcategoryInfo.save()
        res.status(200).json({
            msg: 'New subcategory added successfully',
            data: addSubcategoryInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router