const express = require('express');
const router = express.Router();

const slugify = require('slugify');

var webp = require('webp-converter');

const auth = require('../../../middleware/admin/auth');
const UploadImage = require('../../../models/UploadImage');
const Offer = require('../../../models/Offer');
const Product = require('../../../models/Product');
const Category = require('../../../models/Category');

const {
    upload,
    removeNotvalidateFile,
    removeUploadedImageFile,
    getAdminRoleChecking
} = require('../../../lib/helpers');


// @route GET api/offer/lists
// @description get all offer
// @access Private - offer access
router.get('/lists/:pageNo', async (req, res) => {

    // const adminRoles = await getAdminRoleChecking(req.admin.id, 'offer')

    // if (!adminRoles) {
    //     return res.status(400).send({
    //         errors: [
    //             {
    //                 msg: 'Account is not authorized for offer'
    //             }
    //         ]
    //     })
    // }

    try {
        let dataList = 20
        let offset = (parseInt(req.params.pageNo) - 1) * 20

        let branch = req.query.branch

        let condition = {
            branch,
            offerstatus: {
                $eq: true
            }
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'name') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch,
                    offerstatus: {
                        $eq: true
                    }
                }
            }

        }

        condition.isAvailable = true;

        let product = await Product.find(condition).limit(dataList).skip(offset).sort({
            _id: -1
        })
        //console.log(product)
        res.status(200).json({
            data: product
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
})
// @route POST api/offer
// @description upload image
// @access Private - admin access
router.post('/create', [auth, upload.single('file')], async (req, res) => {
    let name = req.body.name
    let discount = req.body.discount

    const uploadedFileDetails = req.file

    if (!name) {
        return res.status(400).send({
            errors: [{
                msg: 'Product not be empty.'
            }]
        })
    }

    let product = await Product.findById(name)
    if (!product) {
        return res.status(400).send({
            errors: [{
                msg: 'Product not found.'
            }]
        })
    }
    if (uploadedFileDetails == undefined) {
        return res.status(400).send({
            errors: [{
                msg: 'Cover image is required.'
            }]
        })
    }


    const adminRoles = await getAdminRoleChecking(req.admin.id, 'offer')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized for offer'
            }]
        })
    }


    let validationMessage = '';
    if (uploadedFileDetails.mimetype === 'image/png' || uploadedFileDetails.mimetype === 'image/jpeg') {
        const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
        if (filesize < 1) {
            try {

                let path = uploadedFileDetails.path.replace('public\\', '/')
                let url = path.replace(/\\/g, "/")

                product.offerimage = url.replace('public', '')
                product.discount = discount
                product.offerstatus = true

                await product.save()

                return res.status(200).json({
                    msg: 'Offer add successfully',
                    data: product
                })


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

// @route GET api/category/data/:offerID
// @description Get single category
// @access Private
router.get('/data/:offerID', async (req, res) => {

    try {
        let offer = await Product.findById(req.params.offerID)

        res.status(200).json({
            data: offer
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid offer'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route PUT api/offer
// @description Update single offer
// @access Private
router.put('/update', [auth, upload.single('file')], async (req, res) => {
    let offerID = req.body.offer
    let name = req.body.name
    let status = req.body.status
    let discount = req.body.discount

    const uploadedFileDetails = req.file

    if (!name) {
        return res.status(400).send({
            errors: [{
                msg: 'Product not be empty.'
            }]
        })
    }
    let productItem = await Product.findById(name)
    if (!productItem) {
        return res.status(400).send({
            errors: [{
                msg: 'Product not found.'
            }]
        })
    }
    if (!status) {
        return res.status(400).send({
            errors: [{
                msg: 'Status not be empty.'
            }]
        })
    }
    if (!offerID) {
        return res.status(400).send({
            errors: [{
                msg: 'Product id required.'
            }]
        })
    }


    const adminRoles = await getAdminRoleChecking(req.admin.id, 'offer')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized for offer'
            }]
        })
    }


    let product = await Product.findById(offerID)
    let validationMessage = '';
    if (uploadedFileDetails !== undefined) {
        if (uploadedFileDetails.mimetype === 'image/png' || uploadedFileDetails.mimetype === 'image/jpeg') {
            const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
            if (filesize < 1) {
                try {

                    let path = uploadedFileDetails.path.replace('public\\', '/')
                    let url = path.replace(/\\/g, "/")

                    product.offerimage = url.replace('public', '')

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
    product.offerstatus = status
    product.discount = discount
    await product.save()

    return res.status(200).json({
        msg: 'Offer update successfully',
        data: product
    })

})


// @route GET api/upload/image/remove/:removeID
// @description remove image
// @access Private - admin access
router.delete('/remove/:removeID', [auth], async (req, res) => {

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'offer')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized for offer'
            }]
        })
    }

    try {
        let product = await Product.findById(req.params.removeID)

        if (product.length == 0) {
            return res.status(400).send({
                errors: [{
                    msg: 'Image is invalid'
                }]
            })
        }
        product.offerstatus = false
        product.discount = 0

        await product.save()

        return res.status(200).json({
            msg: 'Offer removed successfully'
        })

    } catch (error) {
        console.error(error.message)
        return res.status(500).send('Server error')
    }
})


router.get('/products', async (req, res) => {

    try {
        let branch = req.query.branch


        let condition = {
            branch,
            offerstatus: {
                $eq: true
            }
        }

        if (req.query.category !== undefined) {

            let category = req.query.category
            if (category) {
                condition = {
                    branch,
                    offerstatus: {
                        $eq: true
                    },
                    category: category
                }
            }
        }

        let products = await Product.find(condition).populate('unitType', ['shortform']).populate('subcategory', ['name']).populate('category', ['name']).sort({
            _id: -1
        })
        res.status(200).json({
            data: products
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
})
router.get('/count', async (req, res) => {

    try {
        let branch = req.query.branch

        let condition = {
            branch,
            offerstatus: {
                $eq: true
            }
        }

        condition.isAvailable = true


        let data = await Product.find(condition).count()
        res.status(200).json({
            data: data
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
})
router.get('/offer_category', async (req, res) => {

    try {
        let branch = req.query.branch

        let condition = {
            branch,
            offerstatus: {
                $eq: true
            }
        }

        condition.isAvailable = true

        let data = await Product.find(condition).distinct("category")
        let categoryID = []
        data.map(value => categoryID.push(value))
        let query = {
            ['_id']: {
                $in: categoryID
            }
        }

        const category = await Category.find(query)
        res.status(200).json({
            data: category
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
})
router.get('/slider', async (req, res) => {

    try {
        let branch = req.query.branch

        let condition = {
            branch,
            offerstatus: {
                $eq: true
            }
        }

        condition.isAvailable = true

        let data = await Product.find(condition).limit(5).populate('subcategory', ['name']).populate('category', ['name'])
        res.status(200).json({
            data: data
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
})


module.exports = router