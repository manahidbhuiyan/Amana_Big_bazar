const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/user/auth');
const Cart = require('../../../models/Cart');

// @route DELETE api/cart
// @description Remove All Product
// @access Private
router.delete('/delete', [auth,
    [
        check('branch', 'branch id required').not().isEmpty(),
        check('clear_all', 'clear type is required').trim().isBoolean()
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const user = await User.findById(req.user.id).select('-password').select('-forgot');

        if(!user){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'invailid user.'
                  }
                ]
            })
        }

        let {branch, id, clear_all} = req.body
        
        if(clear_all == 'true'){
            // See if user exsist
            let cart = await Cart.deleteMany({
               branch,
               user: req.user.id 
            })

            return res.status(200).json({
                msg: 'cart is empty'
            });
        }else{
            if(!id){
                return res.status(400).send({
                    errors: [
                      {
                        msg: 'cart id required to remove specific product'
                      }
                    ]
                })
            }

             // See if user exsist
            let cart = await Cart.findById(id)

            if(cart){
                if(cart.branch != branch){
                    return res.status(400).send({
                        errors: [
                        {
                            msg: 'invailid branch and product.'
                        }
                        ]
                    })
                }
                else{
                    await cart.remove();
                    let cartdata = await Cart.find({
                        user:user.id,
                        branch:branch
                    }).populate('product',['discount']).sort({ "_id": 1 })
                    return res.json(cartdata);

                }
            }else{
                return res.status(400).send({
                    errors: [
                    {
                        msg: 'product not found.'
                    }
                    ]
                })
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router