const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const Supplier = require('../../../models/Supplier');
const ReceiveFromSupplier = require('../../../models/Tracking/Transaction/ReceiveFromSupplier');
const Brand = require('../../../models/BrandName');
const Subcategory = require('../../../models/SubCategory');
const Category = require('../../../models/Category');
const Branch = require('../../../models/Branch');
const Product = require('../../../models/Product');
const ShopSetup = require('../../../models/ShopSetup');

// @route GET api/product
// @description Get all the products
// @access Private
router.get('/list/:pageNo', async (req, res) => {
    try {
        let dataList = 30
        let offset = (parseInt(req.params.pageNo) - 1) * dataList

        let branch = req.query.branch

        let condition = {
            branch
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'subcategory') {
                let subcategoryID = []
                const subcategory = await Subcategory.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                subcategory.map(value => subcategoryID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: subcategoryID
                    },
                    branch
                }
            } else if (columnName == 'category') {
                let categoryID = []
                const category = await Category.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                category.map(value => categoryID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: categoryID
                    },
                    branch
                }
            } else if (columnName == 'supplier') {
                let supplierID = []
                const supplier = await Supplier.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                supplier.map(value => supplierID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: supplierID
                    },
                    branch
                }
            } else if (columnName == 'brand') {
                let brandID = []
                const brand = await Brand.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                brand.map(value => brandID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: brandID
                    },
                    branch
                }
            } else if (columnName == 'barcode') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else if (columnName == 'name') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            }

        }else{
            if (req.query.category){
                condition.category = {
                    $in: req.query.category
                }
            }

            if (req.query.subcategory){
                condition.subcategory = {
                    $in: req.query.subcategory
                }
            }

            if (req.query.brand){
                condition.brand = {
                    $in: req.query.brand
                }
            }

            if (req.query.supplier){
                condition.supplier = {
                    $in: req.query.supplier
                }
            }

            if (req.query.text){
                condition.name = {
                    $regex: req.query.text.toLowerCase(),
                    $options: "i"
                }
            }
        }

        let product;

        //pageno have to be -999 to get all data in one call
        if(parseInt(req.params.pageNo)==-999){
            product = await Product.find(condition).populate(['availableSize']).populate('brand', ['name']).populate('subcategory', ['name']).populate('category', ['name']).populate('branch', ['name']).populate('supplier', ['name']).sort({
                "_id": -1
            })
        }else{
            product = await Product.find(condition).populate(['availableSize']).populate('brand', ['name']).populate('subcategory', ['name']).populate('category', ['name']).populate('branch', ['name']).populate('supplier', ['name']).limit(dataList).skip(offset).sort({
                "_id": -1
            })
        }

        

        let totalProductNumber = await Product.find(condition).countDocuments();

        res.status(200).json({
            data: product,
            count: totalProductNumber
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});



// @route POST api/product/search/list/:pageNo
// @description Get all the searched product
// @access Public
router.post('/search/list/:pageNo', async (req, res) => {
    try {
        let dataList = 30
        let offset = (parseInt(req.params.pageNo) - 1) * dataList

        let branch = req.query.branch

        const {category, subcategory, brand, supplier, min_price, max_price, name, special_offer, new_product} = req.body

        let condition = {
            branch
        }

        if (min_price!=null && max_price!=null){
            condition = {
                branch,
                "price.sell":{
                    $gte: min_price,
                    $lte: max_price
                }
            }
        }

        if (category){
            condition.category = {
                $in: category
            }
        }

        if (subcategory){
            condition.subcategory = {
                $in: subcategory
            }
        }

        if (brand && brand.length>0){
            condition.brand = {
                $in: brand
            }
        }

        if (supplier && supplier.length>0){
            condition.supplier = {
                $in: supplier
            }
        }

        if (name){
            condition.name = {
                $regex: name.toLowerCase(),
                $options: "i"
            }
        }

        if (new_product){
            condition.newProduct = new_product
        }

        if (special_offer){
            condition.specialOffer = special_offer
        }

        let product;

        //pageno have to be -999 to get all data in one call
        if(parseInt(req.params.pageNo)==-999){
            product = await Product.find(condition).populate(['availableSize']).populate('brand', ['name']).populate('subcategory', ['name']).populate('category', ['name']).populate('branch', ['name']).populate('supplier', ['name']).sort({
                "_id": -1
            })
        }else{
            product = await Product.find(condition).populate(['availableSize']).populate('brand', ['name']).populate('subcategory', ['name']).populate('category', ['name']).populate('branch', ['name']).populate('supplier', ['name']).limit(dataList).skip(offset).sort({
                "_id": -1
            })
        }

        let totalProductNumber = await Product.find(condition).countDocuments();

        res.status(200).json({
            data: product,
            count: totalProductNumber
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/product
// @description Get all the products
// @access Private
router.get('/cart/search/list/:pageNo', async (req, res) => {
    try {
        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * dataList

        let branch = req.query.branch

        let condition = {
            branch,
            pos_active: { $ne: false }
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'subcategory') {
                let subcategoryID = []
                const subcategory = await Subcategory.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                subcategory.map(value => subcategoryID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: subcategoryID
                    },
                    branch,
                    pos_active: { $ne: false }
                }
            } else if (columnName == 'category') {
                let categoryID = []
                const category = await Category.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                category.map(value => categoryID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: categoryID
                    },
                    branch,
                    pos_active: { $ne: false }
                }
            } else if (columnName == 'brand') {
                let brandID = []
                const brand = await Brand.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                brand.map(value => brandID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: brandID
                    },
                    branch,
                    pos_active: { $ne: false }
                }
            } else if (columnName == 'barcode') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch,
                    pos_active: { $ne: false }
                }
            } else if (columnName == 'name') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch,
                    pos_active: { $ne: false }
                }
            } else {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch,
                    pos_active: { $ne: false }
                }
            }

        }

        let product = await Product.find(condition).select('_id name price barcode quantity second_price').limit(dataList).skip(offset).sort({
            "_id": -1
        })

        let totalProductNumber = await Product.find(condition).countDocuments();

        let loadMore = (offset + product.length) >= totalProductNumber ? false : true

        res.status(200).json({
            data: product,
            total: totalProductNumber,
            loadMore: loadMore
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/product
// @description Get all the products
// @access Private
router.get('/lists/:pageNo', async (req, res) => {

    try {
        let dataList = 16
        let offset = (parseInt(req.params.pageNo) - 1) * 16

        let branch = req.query.branch

        let condition = {
            branch,
        }
        if (req.query.min_price && req.query.max_price){
            condition = {
                branch,
                "price.sell":{
                    $gte: Number(req.query.min_price),
                    $lte: Number(req.query.max_price)
                }
            }
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.slug

            if (columnName == 'subcategory') {
                let subcategoryID = []
                const subcategory = await Subcategory.find({
                    slug: text
                }).select('id')
                subcategory.map(value => subcategoryID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: subcategoryID
                    },
                    branch
                }
            } else if (columnName == 'category') {
                let categoryID = []
                const category = await Category.find({
                    slug: text
                }).select('id')
                category.map(value => categoryID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: categoryID
                    },
                    branch
                }
            } else if (columnName == 'brand') {
                let brandID = []
                const brand = await Brand.find({
                    slug: text
                }).select('id')
                brand.map(value => brandID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: brandID
                    },
                    branch
                }
            } else if (columnName == 'barcode') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else if (columnName == 'name') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            }

        }else{
            if (req.query.category){
                let categoryID = []
                const category = await Category.find({
                    name: decodeURI(req.query.category)
                }).select('id')
                category.map(value => categoryID.push(value._id))
                condition.category = {
                    $in: categoryID
                }
            }

            if (req.query.subcategory){
                let subcategoryID = []
                const subcategory = await Subcategory.find({
                    name: decodeURI(req.query.subcategory)
                }).select('id')
                subcategory.map(value => subcategoryID.push(value._id))

                condition.subcategory = {
                    $in: subcategoryID
                }
            }

            if (req.query.brand){
                let brandID = []
                const brand = await Brand.find({
                    name: decodeURI(req.query.brand)
                }).select('id')
                brand.map(value => brandID.push(value._id))

                condition.brand = {
                    $in: brandID
                }
            }

            if (req.query.supplier){
                let supplierID = []
                const supplier = await Supplier.find({
                    name: decodeURI(req.query.supplier)
                }).select('id')
                supplier.map(value => supplierID.push(value._id))

                condition.supplier = {
                    $in: supplierID
                }
            }

            if (req.query.specialOffer){
                condition.specialOffer = true
            }

            if (req.query.newProduct){
                condition.newProduct = true
            }

            if (req.query.name){
                condition.name = {
                    $regex: req.query.name.toLowerCase(),
                    $options: "i"
                }
            }
        }

        condition.isAvailable = true

        let product = await Product.find(condition).populate(['availableSize']).populate('brand', ['name']).populate('subcategory', ['name']).populate('category', ['name']).populate('branch', ['name']).populate('supplier', ['name']).populate('unitType', ['shortform']).limit(dataList).skip(offset).sort({
            "_id": -1
        })

        let totalProductNumber = await Product.find(condition).countDocuments();

        res.status(200).json({
            data: product,
            count: totalProductNumber
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/product
// @description Get all the products
// @access Private
router.get('/allproduct', async (req, res) => {

    try {
        let branch = req.query.branch
        let condition = {
            branch
        }
        let product = await Product.find(condition).sort({
            name: 1
        })


        res.status(200).json({
            data: product
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/supplier-wise/product
// @description Get all the products
// @access Private
router.get('/supplier-wise/product', async (req, res) => {

    try {
        let branch = req.query.branch
        let supplier = req.query.supplier
        let condition = {
            branch,
            supplier,
            pos_active: { $ne: false }
        }
        let product = await Product.find(condition).sort({
            // name: 1 
        }).select('_id name barcode price quantity vat second_price').populate('unitType', ['shortform', 'name'])


        res.status(200).json({
            data: product.sort((a, b) => a.name.localeCompare(b.name))
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/category-wise/product
// @description Get all the products
// @access Private
router.get('/category-wise/product', async (req, res) => {

    try {
        let branch = req.query.branch
        let category = req.query.category
        let condition = {
            branch,
            category
        }
        let product = await Product.find(condition).sort({
            name: 1
        }).select('_id name barcode price quantity vat').populate('unitType', ['shortform', 'name'])


        res.status(200).json({
            data: product
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/product/branch/category/wise/product
// @description Get all the products
// @access Private
router.post('/branch/category/wise/product', [
    check('from_branch', 'From branch is required').not().isEmpty(),
    check('to_branch', 'To branch is required').not().isEmpty(),
    check('category', 'Category is required').not().isEmpty(),
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }


    try {
        const {
            from_branch,
            to_branch,
            category
        } = req.body

        const shopSetupExist = await ShopSetup.findOne({
            from_branch,
            category: {
                $in: category
            },
            to_branch
        })

        if (shopSetupExist) {
            return res.status(400).send({
                errors: [{
                    msg: 'Shop setup category already exists'
                }]
            })
        }

        let condition = {
            branch: from_branch,
            category: {
                $in: category
            }
        }

        let products = await Product.find(condition).sort({
            name: 1
        }).select("-id")

        products.map(async (product) => {
            let productInsert = new Product({
                branch: to_branch,
                category: product.category,
                subcategory: product.subcategory,
                brand: product.brand,
                supplier: product.supplier,
                barcode: product.barcode,
                name: product.name,
                slug: product.slug,
                quantity: product.quantity,
                price: product.price,
                newProduct: product.newProduct,
                specialOffer: product.specialOffer,
                bestSell: product.bestSell,
                thumbnail: product.thumbnail,
                images: product.images
            })

            if (product.sold) {
                productInsert.sold = product.sold
            }

            if (product.description) {
                productInsert.description = product.description
            }

            if (product.expireDate) {
                productInsert.expireDate = product.expireDate
            }

            if (product.reorderLevel) {
                productInsert.reorderLevel = product.reorderLevel
            }

            if (product.weight) {
                productInsert.weight = product.weight
            }

            if (product.unitType) {
                productInsert.unitType = product.unitType
            }

            if (product.availableSize) {
                productInsert.availableSize = product.availableSize
            }

            if (product.discount) {
                productInsert.discount = product.discount
            }

            if (product.active) {
                productInsert.isAvailable = product.active
            }

            await productInsert.save()
        })

        res.status(200).json({
            data: products.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/product
// @description Get all the products
// @access Private
router.get('/search', async (req, res) => {

    try {
        let dataList = 6

        let branch = req.query.branch

        let condition = {
            branch
        }
        if (req.query.category_id !== undefined) {
            let category_id = req.query.category_id
            let text = req.query.text
            if (category_id != 'all_category') {
                console.log('secound')
                let categoryID = []
                const category = await Category.find({
                    _id: category_id
                }).select('id')
                category.map(value => categoryID.push(value._id))

                condition = {
                    ['name']: {
                        $regex: text,
                        $options: "i"
                    },
                    ['category']: {
                        $in: categoryID
                    },
                    branch
                }


            } else {
                condition = {
                    ['name']: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            }


        }

        condition.isAvailable = true

        let product = await Product.find(condition).populate('subcategory', ['name']).populate('category', ['name']).limit(dataList).sort({
            "_id": -1
        })


        res.status(200).json({
            data: product
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/product/:productID
// @description Get single product
// @access Private
router.get('/single/:productID', async (req, res) => {

    try {
        let receiveFromSupplier = await ReceiveFromSupplier.find({
            "products.product._id": req.params.productID
        });

        let product = await Product.findById(req.params.productID).populate('brand', ['name']).populate('subcategory', ['name', 'isSizeAvailable', 'isWeightAvailable']).populate('category', ['name']).populate('branch', ['name']).populate('supplier', ['name']).populate('availableSize', ['name']).populate('unitType', ['name', 'shortform']).populate('created_by', ['name', 'email'])

        res.status(200).json({
            data: product,
            alreadyReceived: receiveFromSupplier.length > 0 ? true : false
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid brand'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/product/:slug
// @description Get single product
// @access Private
router.get('/single/barcode/:barcode', async (req, res) => {

    try {
        let branch = req.query.branch
        let product = await Product.findOne({
            barcode: req.params.barcode,
            branch
        }).populate('brand', ['name']).populate('subcategory', ['name', 'isSizeAvailable', 'isWeightAvailable']).populate('category', ['name']).populate('branch', ['name']).populate('supplier', ['name']).populate('availableSize', ['name']).populate('unitType', ['name', 'shortform', 'fractionAllowed'])

        console.log(product)
        res.status(200).json({
            data: product
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid brand'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET /single/barcode/dual-price-check/:barcode
// @description Get single product
// @access Private
router.get('/single/barcode/dual-price-check/:barcode', async (req, res) => {

    try {
        let branch = req.query.branch
        let product = await Product.findOne({
            barcode: req.params.barcode,
            branch
        }).select('price quantity second_price barcode name')

        return res.status(200).json({
            data: product,
            dual_price: product.second_price.quantity > 0 ? true : false
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

// @route GET api/product/:slug
// @description Get single product
// @access Private
router.get('/single/slug/:slug', async (req, res) => {

    try {
        let branch = req.query.branch
        if (!branch) {
            return res.status(400).send({
                errors: [{
                    msg: 'branch id is required'
                }]
            })
        }

        let product = await Product.findOne({
            slug: req.params.slug,
            branch,
            isAvailable: true
        }).populate('brand', ['name']).populate('subcategory', ['name']).populate('category', ['name']).populate('branch', ['name']).populate('supplier', ['name']).populate('availableSize', ['name']).populate('unitType', ['name', 'shortform'])

        if (!product) {
            return res.status(400).send({
                errors: [{
                    msg: 'No product found'
                }]
            })
        }

        let relatedProducts = await Product.find({
            subcategory: product.subcategory._id,
            _id:{
                $ne: product._id
            },
            isAvailable: true
        }).populate('subcategory', ['name']).populate('category', ['name']).limit(10)

        res.status(200).json({
            data: product,
            related: relatedProducts
        });

    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid brand'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router