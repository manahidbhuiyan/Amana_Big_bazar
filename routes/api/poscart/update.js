const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const Product = require('../../../models/Product');
const Cart = require('../../../models/PosCart');
const Admin = require('../../../models/admin/Admin');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route PUT api/branch
// @description Add New Branch or Shop Location
// @access Private
router.put('/quantity_update/', [auth,
    [
        check('branch', 'Branch id required').not().isEmpty(),
        check('code', 'Product code required').not().isEmpty(),
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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'poscart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let browserTabID = req.query.tabID

        const product = await Product.findById(req.body.code).select('branch')


        if (product) {
            if (product.branch != req.body.branch) {
                return res.status(400).send({
                    errors: [{
                        msg: 'Invailid branch and product.'
                    }]
                })
            } else {

                let cartdata = await Cart.findOne({
                    admin: user.id,
                    branch: req.body.branch,
                    browserTabID: browserTabID
                }).populate('product', ['discount']).sort({
                    "_id": -1
                })

                if (!cartdata) {
                    return res.status(400).send({
                        errors: [{
                            msg: 'Invailid request.'
                        }]
                    })

                } else {
                    const cartProductExsistance = cartdata.products.find(product => product.code == req.body.code)

                    if (cartProductExsistance) {
                        cartdata.products.quantity++
                    } else {
                        return res.status(400).send({
                            errors: [{
                                msg: 'Product not found.'
                            }]
                        })
                    }
                }

                let cart = await Cart.find({
                    user: user.id,
                    branch: req.query.branch,
                    browserTabID: browserTabID
                }).populate('product', ['discount']).sort({
                    "_id": -1
                })

                return res.status(200).json({
                    auth: true,
                    data: cart
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

module.exports = router