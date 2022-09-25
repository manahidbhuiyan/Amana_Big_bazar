const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const bwipjs = require('bwip-js');
const config = require('config')

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../middleware/user/auth');
const adminAuth = require('../../../middleware/admin/auth');
const Product = require('../../../models/Product');



const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

const Admin = require('../../../models/admin/Admin');

// @route GET api/order
// @description Get all the orders
// @access Private
router.post('/print/zebra/barcode', [
    adminAuth,
    [
        check('product_data', 'Product data is required').not().isEmpty(),
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

        let {
            product_data
        } = req.body

        let allProductData = []

        product_data.map((product, index)=>{
            bwipjs.toBuffer({
                bcid:        'code128',       // Barcode type
                text:        product.barcode,    // Text to encode
                scale: 3, // 3x scaling factor
                height: 7, // Bar height, in millimeters
                includetext: true,            // Show human-readable text
                textxalign:  'center',        // Always good to set this
            }, async function (err, png) {
                if (err) {
                    // `err` may be a string or Error object
                } else {
                    //console.log(png.toString('base64'))

                    let productInfo = await Product.findOne({
                        barcode: product.barcode,
                        branch: product.branch
                    }).select('name').populate(['availableSize']).populate('unitType', ['shortform']).populate('subcategory', ['name'])
                    for(let i=0; i<product.quantity; i++)
                    {
                        allProductData.push({
                            _id: productInfo._id,
                            company: config.get('company').name,
                            name: product.name.length > 25 ? (product.name.substring(0, 25)).trim()+'...':(product.name.substring(0, 25)).trim(),
                            barcode: product.barcode,
                            subcategory: productInfo.subcategory.name.length > 25 ? (productInfo.subcategory.name.substring(0, 25)).trim()+'...':(productInfo.subcategory.name.substring(0, 25)).trim(),
                            sizeAvailable: productInfo.availableSize.length > 0 ? true : false ,
                            sizeName: productInfo.availableSize.length > 0 ? productInfo.availableSize[0].name : null,
                            sizeShortForm: productInfo.availableSize.length > 0 ? productInfo.availableSize[0].shortform : null,
                            price: product.price,
                            vat: product.vat == 0 ? false : true,
                            imageData: png.toString('base64')
                        })
                    }

                    allProductData.push({
                        _id: null,
                        company: null,
                        name: null,
                        barcode: null,
                        imageData: null
                    })

                    if(product_data.length == (index+1)){
                        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'reports', 'barcode', 'zebra_print.html'), 'utf8');

                        var options = {
                            "height": "1.0in",        // allowed units: mm, cm, in, px
                            "width": "1.5in", 
                            // format: "A4",
                            // orientation: "landscape",
                            // border: "5mm"
                        }
                
                
                        var document = {
                            html: html,
                            data: {
                                data: allProductData
                            },
                            path: "./public/reports/zebra_barcode_print.pdf"
                        };
                
                        setTimeout(()=>{
                            pdf.create(document, options)
                            .then(data => {
                                const file = data.filename;
                                // console.log(file)
                                return res.status(200).json({
                                    auth: true,
                                    fileLink: '/reports/zebra_barcode_print.pdf' 
                                })
                            })
                            .catch(error => {
                                console.error(error)
                            });
                        }, 3000)
                    }
                    // `png` is a Buffer
                    // png.length           : PNG file length
                    // png.readUInt32BE(16) : PNG image width
                    // png.readUInt32BE(20) : PNG image height
                }
            });
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router