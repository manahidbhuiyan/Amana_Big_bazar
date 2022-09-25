const express = require('express');
const router = express.Router();

const ProductWeightUnit = require('../../../models/ProductWeightUnit');

// @route GET api/product/weight
// @description Get Product Size
// @access Public
router.get('/', async (req, res) => {
    
    try {
        let productWeightUnit = await ProductWeightUnit.find({})
    
        res.status(200).json({
            data: productWeightUnit
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
        let productWeightUnit = await ProductWeightUnit.findById(req.params.sizeID)
    
        res.status(200).json({
            data: productWeightUnit
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid product weight type'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router