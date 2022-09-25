const express = require('express');
const router = express.Router();

const ProductSize = require('../../../models/ProductSize');

// @route GET api/product/size
// @description Get Product Size
// @access Public
router.get('/', async (req, res) => {
    
    try {
        let productSize = await ProductSize.find({})
    
        res.status(200).json({
            data: productSize
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/product/type/:sizeID
// @description Get Single Product Size
// @access Public
router.get('/:sizeID', async (req, res) => {
    
    try {
        let productSize = await ProductSize.findById(req.params.sizeID)
    
        res.status(200).json({
            data: productSize
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid product size'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router