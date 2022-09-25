const express = require('express');
const router = express.Router();

const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const ShopSetup = require('../../../models/ShopSetup');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');
const BrandName = require('../../../models/BrandName');
const Supplier = require('../../../models/Supplier');

// @route PUT api/category
// @description Update single category
// @access Private
router.put('/', [auth,
    [
        check('shopSetupID', 'Shop setup id required').not().isEmpty(),
        check('from_branch', 'Copy from branch is required').not().isEmpty(),
        check('category', 'Category is required').not().isEmpty(),
        check('to_branch', 'Copy to branch is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'shop setup')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to shop setup'
                }]
            })
        }

        const {
            from_branch,
            category,
            to_branch
        } = req.body


        let shopSetup = await ShopSetup.findById(req.body.shopSetupID)

        await Product.deleteMany({
            branch: shopSetup.to_branch,
            category: {
                $in: shopSetup.category
            }
        })

        shopSetup.from_branch = from_branch
        shopSetup.category = category
        shopSetup.to_branch = to_branch
        shopSetup.update = Date.now()

        await shopSetup.save()
        res.status(200).json({
            msg: 'Shop setup information updated successfully',
            data: shopSetup
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid shop setup id'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route PUT api/category
// @description Update single category
// @access Private
router.put('/single-brand-setup', auth, async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'shop setup')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to shop setup'
                }]
            })
        }
       
        const {
            branches,
            brand
        } = req.body
        
       
        let brandData = await BrandName.findOne({
            _id: brand
        }).select("branch name")

        
        branches.map((newBranch) => {
            let brandIndex = brandData.branch.findIndex(existBranch => existBranch._id == newBranch.id)
            if (brandIndex === -1) {
                BrandName.updateOne(
                    { "_id": brandData._id},
                    { "$push": { "branch": newBranch.id } },
                    function (err, raw) {
                        if (err) return handleError(err);
                    }
                 );
               } 
        })


        
        res.status(200).json({
            msg: 'Branches are added successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid shop setup id'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route PUT api/category
// @description Update single category
// @access Private
router.put('/all-brand-setup', auth, async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'shop setup')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to shop setup'
                }]
            })
        }
       
        const {
            branches,
            brand
        } = req.body

        branches.map((newBranch) => {
            brand.map(async (brandInfo) => {
                let brandIndex = brandInfo.branch.findIndex(existBranch =>  existBranch._id === newBranch.id)
               if (brandIndex === -1) {
                BrandName.updateOne(
                    { "_id": brandInfo._id},
                    { "$push": { "branch": newBranch.id } },
                    function (err, raw) {
                        if (err) return handleError(err);
                    }
                 );
               } 
            })
        })

        res.status(200).json({
            msg: 'Branches are added successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid shop setup id'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route PUT api/category
// @description Update single category
// @access Private
router.put('/single-supplier-setup', auth, async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'shop setup')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to shop setup'
                }]
            })
        }
       
        const {
            branches,
            supplier
        } = req.body
        
       // console.log(brand)
        let supplierData = await Supplier.findOne({
            _id: supplier
        }).select("branch name")

        
        branches.map((newBranch) => {
            let supplierIndex = supplierData.branch.findIndex(existBranch => existBranch._id == newBranch.id)
            if (supplierIndex === -1) {
                Supplier.updateOne(
                    { "_id": supplierData._id},
                    { "$push": { "branch": newBranch.id } },
                    function (err, raw) {
                        if (err) return handleError(err);
                    }
                 );
               } 
        })


        
        res.status(200).json({
            msg: 'Suppliers are added successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid shop setup id'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route PUT api/category
// @description Update single category
// @access Private
router.put('/all-supplier-setup', auth, async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'shop setup')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to shop setup'
                }]
            })
        }
       
        const {
            branches,
            supplier
        } = req.body

        branches.map((newBranch) => {
            supplier.map(async (supplierInfo) => {
                let supplierIndex = supplierInfo.branch.findIndex(existBranch =>  existBranch._id === newBranch.id)
                
               if (supplierIndex === -1) {
                Supplier.updateOne(
                    { "_id": supplierInfo._id},
                    { "$push": { "branch": newBranch.id } },
                    function (err, raw) {
                        if (err) return handleError(err);
                    }
                 );
               } 
            })
        })

        res.status(200).json({
            msg: 'Suppliers are added successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid shop setup id'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router