const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const config = require('config');

const auth = require('../../../middleware/admin/auth');
const Product = require('../../../models/Product');
const Category = require('../../../models/Category');
const Cart = require('../../../models/PosCart');
const Admin = require('../../../models/admin/Admin');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.post('/', [auth,
    [
        check('branch', 'Branch id required').not().isEmpty(),
        check('barcode', 'Product code required').not().isEmpty()
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        let outOfStockFlag = false

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');
        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let barcode;
        let quantity = 1;
        let checkTwoDigit = req.body.barcode.slice(0, config.get('weightMachine').categoryNumber)

        if (checkTwoDigit == config.get('weightMachine').categoryID) {
            barcode = req.body.barcode.slice(config.get('weightMachine').categoryNumber, (config.get('weightMachine').categoryNumber + config.get('weightMachine').barcodeNumber))
            quantity = Number(req.body.barcode.slice((config.get('weightMachine').categoryNumber + config.get('weightMachine').barcodeNumber), (config.get('weightMachine').categoryNumber + config.get('weightMachine').barcodeNumber + config.get('weightMachine').weightNumber)))
        } else {
            barcode = req.body.barcode
        }

        const product = await Product.findOne({
            barcode: barcode,
            branch: req.body.branch,
            pos_active: { $ne: false }
        }).populate('unitType').select('branch').select('quantity').select('category').select('subcategory').select('name').select('price').select('second_price').select('discount').select('thumbnail').select('vat').select('brand').select('supplier').select('personalDiscountAvailable')

        //let numberOfZero = config.get('weightMachine').weightNumber - quantity.toString().length
        let categoryDetails = null
        if(product){
            categoryDetails = await Category.findById(product.category).select('nbr_sd_code nbr_vat_code')

            if(product.unitType){
                if (product.unitType.shortform == 'kg' && checkTwoDigit == config.get('weightMachine').categoryID) {
                    quantity = quantity / 1000
                }
            }

            if (Number(product.quantity.toFixed(3)) <= 0) {
                return res.status(400).send({
                    errors: [{
                        msg: 'Sorry this product out of stock.'
                    }]
                })
            }
        }

        let browserTabID = req.query.tabID

        if (product) {
            if (product.branch != req.body.branch) {
                return res.status(400).send({
                    errors: [{
                        msg: 'Invailid branch and product.'
                    }]
                })
            } else {
                // See if user exsist
                let cart = await Cart.findOne({
                    admin: user.id,
                    branch: req.body.branch,
                    browserTabID: browserTabID,
                    code: barcode
                })
                if (cart) {
                    const cartInfo = await Cart.findById(cart._id)
                    if(quantity==1){
                        cartInfo.quantity += 1
                    }else{
                        cartInfo.quantity += Number(quantity.toFixed(2))
                    }

                    if(req.body.sell_price){
                        if(req.body.sell_price==product.price.sell){
                            if (product.quantity < cartInfo.quantity) {
                                return res.status(400).send({
                                    errors: [{
                                        msg: "Sorry you can't sell more than stock"
                                    }]
                                })
                            }
                        }else if(req.body.sell_price==product.second_price.sell){
                            if (product.second_price.quantity < cartInfo.quantity) {
                                return res.status(400).send({
                                    errors: [{
                                        msg: "Sorry you can't sell more than stock"
                                    }]
                                })
                            }
                        }else{
                            return res.status(400).send({
                                errors: [{
                                    msg: 'Invalid dual price product selected'
                                }]
                            })
                        }
                    }else{
                        if (product.quantity < cartInfo.quantity) {
                            return res.status(400).send({
                                errors: [{
                                    msg: "Sorry you can't sell more than stock"
                                }]
                            })
                        }
                    }
                    
                    await cartInfo.save(); 
                    // return res.status(400).send({
                    //     errors: [{
                    //         msg: 'Product already added.'
                    //     }]
                    // })
                } else {

                    if (product.quantity < quantity) {
                        quantity = product.quantity
                        outOfStockFlag = true
                    }

                    let productDetails = {
                        admin: user.id,
                        branch: req.body.branch,
                        product: product._id,
                        browserTabID: browserTabID,
                        code: barcode,
                        name: product.name,
                        thumbnail: product.thumbnail,
                        category: product.category,
                        vat: product.vat,
                        quantity: Number(quantity.toFixed(3)),
                        subcategory: product.subcategory,
                        brand: product.brand,
                        supplier: product.supplier,
                        discount: product.discount,
                        price: product.price.sell,
                        purchase_price: product.price.purchase,
                        subtotal: Number((product.price.sell*quantity).toFixed(2)),
                        personalDiscountAvailable: product.personalDiscountAvailable,
                        nbr_sd_code: categoryDetails.nbr_sd_code,
                        nbr_vat_code: categoryDetails.nbr_vat_code
                    }
                    
                    if(req.body.sell_price){
                        if(req.body.sell_price==product.price.sell){
                            productDetails.purchase_price = product.price.purchase
                            productDetails.price = product.price.sell
                            productDetails.subtotal = Number((product.price.sell*quantity).toFixed(2))
                        }else if(req.body.sell_price==product.second_price.sell){
                            productDetails.purchase_price = product.second_price.purchase
                            productDetails.price = product.second_price.sell
                            productDetails.subtotal = Number((product.second_price.sell*quantity).toFixed(2))
                            productDetails.is_second_price = true
                        }else{
                            return res.status(400).send({
                                errors: [{
                                    msg: 'Invalid dual price product selected'
                                }]
                            })
                        }
                    }

                    const cartProduct = new Cart(productDetails)
                    await cartProduct.save();
                }

                cart = await Cart.find({
                    admin: user.id,
                    branch: req.body.branch,
                    browserTabID: browserTabID
                }).populate('product', ['discount']).sort({
                    "_id": -1
                })

                return res.status(200).json({
                    auth: true,
                    data: cart,
                    stockout: outOfStockFlag
                });

            }
        } else {
            return res.status(400).send({
                errors: [{
                    msg: 'Product not found.'
                }]
            })
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.put('/quantity-update', [auth,
    [
        check('branch', 'Branch id required').not().isEmpty(),
        check('cart_id', 'Cart id required').not().isEmpty(),
        check('quantity', 'Product quantity required').not().isEmpty(),
    ]
], async (req, res) => {
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }
        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');
        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        let browserTabID = req.query.tabID

        const cart = await Cart.findById(req.body.cart_id)


        if (cart) {
            if (cart.branch != req.body.branch) {
                return res.status(400).send({
                    errors: [{
                        msg: 'Invailid branch and product.'
                    }]
                })
            } else {
                if (req.body.quantity < 0.0001) {
                    await cart.remove();
                } else {
                    cart.quantity = req.body.quantity
                    cart.subtotal = cart.price * req.body.quantity
                    await cart.save();
                }

                let cartdata = await Cart.find({
                    admin: user.id,
                    branch: req.body.branch,
                    browserTabID: browserTabID
                }).populate('product', ['discount']).sort({
                    "_id": -1
                })
                
                res.json(cartdata);
            }
        } else {
            return res.status(400).send({
                errors: [{
                    msg: 'Product not found.'
                }]
            })
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router