const express = require('express');
const router = express.Router();
const slugify = require('slugify');

var webp = require('webp-converter');

const {
    check,
    validationResult
} = require('express-validator');

var isodate = require("isodate");

const auth = require('../../../middleware/admin/auth');
const RequisitionToSupplier = require('../../../models/Tracking/Transaction/RequisitionToSupplier');
const ReceiveFromSupplier = require('../../../models/Tracking/Transaction/ReceiveFromSupplier');
const Product = require('../../../models/Product');

const {
    upload,
    removeNotvalidateFile,
    removeUploadedFile,
    removeUploadedImageFile,
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route PUT api/cart
// @description Update Single product into the cart
// @access Private
router.put('/', [auth,
    [
        check('productID', 'Product id is required').not().isEmpty(),
        check('branch', 'Branch is required').not().isEmpty(),
        check('category', 'Category is required').not().isEmpty(),
        check('subcategory', 'Subcategory is required').not().isEmpty(),
        check('brand', 'Brand is required').not().isEmpty(),
        check('supplier', 'Supplier is required').not().isEmpty(),
        check('barcode', 'Barcode is required').not().isEmpty(),
        check('unitType', 'Unit type is required').not().isEmpty(),
        check('name', 'Name is required').not().isEmpty(),
        check('personalDiscountAvailable', 'personal discount availablity info is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'product')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized to product'
            }]
        })
    }

    var isoCurrentDate = new Date()
    isoCurrentDate.setHours(0)
    isoCurrentDate.setMinutes(0)
    isoCurrentDate.setSeconds(0)

    let receivingErrorFlag = 0
    let receivingErrorData = null

    let receiveFromSupplier = await ReceiveFromSupplier.findOne({
        "products.product._id": req.body.productID
    });

    try {
        const {
            branch,
            category,
            subcategory,
            supplier,
            brand,
            barcode,
            name,
            description,
            expireDate,
            reorderLevel,
            weight,
            availableSize,
            unitType,
            newProduct,
            specialOffer,
            bestSell,
            online_active,
            pos_active,
            personalDiscountAvailable
        } = req.body

        let slug = slugify(name)
        let product = await Product.findById(req.body.productID)

        if(String(barcode).trim()!=String(product.barcode).trim()){
            const existsBarcode = await Product.findOne({
                barcode: String(barcode).trim(),
                branch
            })
    
            if (existsBarcode) {
                return res.status(400).send({
                    errors: [{
                        msg: 'barcode is already exists'
                    }]
                })
            }

            let requisitionToSupplierList = await RequisitionToSupplier.find({
                "products.product._id": req.body.productID,
                "products.expected_delivery": {
                    "$gte": isoCurrentDate
                },
            });

            let promiseArray = requisitionToSupplierList.map(async requisitionInfo=>{
                let receiveFromSupplierData = await ReceiveFromSupplier.findOne({
                    requisitionID: requisitionInfo._id
                }).populate('requisitionID', ['serialNo']);
                if(!receiveFromSupplierData){
                    receivingErrorFlag = 1
                    receivingErrorData = requisitionInfo
                }
            })
        
            await Promise.all(promiseArray)

            if(receivingErrorFlag){
                return res.status(400).send({
                    errors: [{
                        msg: 'barcode is already exists in requisition no. ' + receivingErrorData.serialNo
                    }]
                })
            }
        }

        if (!receiveFromSupplier) {
            product.branch = branch
            product.supplier = supplier
            product.category = category
            product.subcategory = subcategory
            product.brand = brand
        }
        
        product.barcode = String(barcode).trim()
        product.name = name.toLowerCase().trim()
        product.slug = slug.toLowerCase().trim()
        product.newProduct = newProduct
        product.specialOffer = specialOffer
        product.bestSell = bestSell
        product.personalDiscountAvailable = personalDiscountAvailable

        
        // product.isAvailable = active
        product.created_by = req.admin.id

        product.update = Date.now()

        if (description) {
            product.description = description
        }

        if (expireDate) {
            let expireDateInfo = new Date(expireDate)
            product.expireDate = isodate(expireDateInfo)
        }

        if (reorderLevel) {
            product.reorderLevel = reorderLevel
        }

        if (weight) {
            product.weight = weight
        }

        if (unitType) {
            product.unitType = unitType
        }

        // if (availableSize) {
        //     product.availableSize = availableSize
        // }

        if (pos_active) {
            product.pos_active = pos_active
        }

        if (online_active) {
            product.online_active = online_active
        }

        await product.save()


        res.status(200).json({
            msg: 'Product information updated successfully',
            data: product
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid product'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route PUT api/product/:productID/image/upload
// @description upload product image
// @access Private - admin access
router.put('/:productID/image/upload', [auth, upload.single('file')], async (req, res) => {
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'product')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized for property'
            }]
        })
    }

    let validationMessage = '';
    const uploadedFileDetails = req.file
    if (uploadedFileDetails.mimetype === 'image/png' || uploadedFileDetails.mimetype === 'image/jpeg') {
        const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
        if (filesize < 1) {
            try {
                let product = await Product.findById(req.params.productID)

                //   let fileSavedPath =  uploadedFileDetails.path.substr(0, uploadedFileDetails.path.lastIndexOf(".")) + ".webp"
                let path = uploadedFileDetails.path.replace('public\\', '/')
                let url = path.replace(/\\/g, "/")

                product.images.push(url.replace('public', ''))
                await product.save()

                return res.status(200).json({
                    msg: 'Product image uploaded successfully',
                    data: product
                })

                // webp.cwebp(uploadedFileDetails.path, fileSavedPath, "-q 80", async function(status,error)
                // {
                //         //if conversion successful status will be '100'
                //         //if conversion fails status will be '101'
                //         removeUploadedImageFile(uploadedFileDetails.path)
                //         if(status==100){
                //             let path = fileSavedPath.replace('public\\', '/')
                //             let url = path.replace(/\\/g, "/")

                //             product.images.push(url)
                //             await product.save()

                //             return res.status(200).json({
                //                 msg: 'Product image uploaded successfully',
                //                 data: product
                //             })
                //     }else{
                //         console.log(error)
                //         return res.status(400).json({
                //             msg: 'Image uploaded filed. Please check your console.'
                //         })
                //     }
                // });
            } catch (error) {
                console.error(error.message)
                return res.status(500).send('Server error')
            }
        } else {
            validationMessage = 'File should not be more than 1 MB.'
            removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
        }
    } else {
        validationMessage = 'Only png and jpg files are allowed.'
        removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
    }
})


// @route PUT api/product/:productID/image/remove
// @description remove product image
// @access Private - admin access
router.put('/:productID/image/remove', [auth,
    [
        check('image_index', 'Image index is required').not().isEmpty(),
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'product')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized for property'
            }]
        })
    }

    const {
        image_index
    } = req.body

    try {
        let product = await Product.findById(req.params.productID)

        if (product.images.length <= image_index) {
            return res.status(400).send({
                errors: [{
                    msg: 'Image removing index is invalid'
                }]
            })
        }

        let path = product.images[image_index].replace('', 'public').replace(/\\/g, "/")

        product.images = product.images.filter((value, index) => index !== image_index)
        await product.save()

        const successInfo = {
            msg: 'Product image removed successfully',
            data: product
        }

        removeUploadedFile(res, path, successInfo)
    } catch (error) {
        console.error(error.message)
        return res.status(500).send('Server error')
    }
})

// @route PUT api/product/:productID/thumbnail/upload
// @description upload product thumbnail image
// @access Private - admin access
router.put('/:productID/thumbnail/upload', [auth, upload.single('file')], async (req, res) => {
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'product')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized for property'
            }]
        })
    }

    let validationMessage = '';
    const uploadedFileDetails = req.file
    if(req.file){
        if (uploadedFileDetails.mimetype === 'image/png' || uploadedFileDetails.mimetype === 'image/jpeg') {
            const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
            if (filesize < 1) {
                try {
                    let product = await Product.findById(req.params.productID)
    
                    let path = uploadedFileDetails.path.replace('public\\', '/')
                    let url = path.replace(/\\/g, "/")
    
                    product.thumbnail = url.replace('public', '')
                    await product.save()
    
                    return res.status(200).json({
                        msg: 'Product thumbnail uploaded successfully',
                        data: product
                    })
    
    
                    //   let fileSavedPath =  uploadedFileDetails.path.substr(0, uploadedFileDetails.path.lastIndexOf(".")) + ".webp"
    
                    // webp.cwebp(uploadedFileDetails.path, fileSavedPath, "-q 80", async function(status,error)
                    // {
                    //         //if conversion successful status will be '100'
                    //         //if conversion fails status will be '101'
                    //         removeUploadedImageFile(uploadedFileDetails.path)
                    //         if(status==100){
                    //             let path = fileSavedPath.replace('public\\', '/')
                    //             let url = path.replace(/\\/g, "/")
    
                    //             product.thumbnail = url
                    //             await product.save()
    
                    //             return res.status(200).json({
                    //                 msg: 'Product thumbnail uploaded successfully',
                    //                 data: product
                    //             })
                    //     }else{
                    //         console.log(error)
                    //         return res.status(400).json({
                    //             msg: 'Image uploaded filed. Please check your console.'
                    //         })
                    //     }
                    // });
                } catch (error) {
                    console.error(error.message)
                    return res.status(500).send('Server error')
                }
            } else {
                validationMessage = 'File should not be more than 1 MB.'
                removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
            }
        } else {
            validationMessage = 'Only png and jpg files are allowed.'
            removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
        }
    }
})

module.exports = router