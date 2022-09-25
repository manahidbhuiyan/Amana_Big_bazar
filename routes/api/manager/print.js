const express = require('express');
const router = express.Router();
var config = require('config')

const {
    check,
    validationResult
} = require('express-validator');

const bwipjs = require('bwip-js');

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

const Admin = require('../../../models/admin/Admin');

// @route GET api/order
// @description Get all the orders
// @access Private
router.post('/print/manager-info', [
    auth,
    [
        check('info', 'Info data is required').not().isEmpty(),
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos manager')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized for pos manager'
                }]
            })
        }

        let {
            info
        } = req.body

        bwipjs.toBuffer({
            bcid:        'code128',       // Barcode type
            text:        info._id,    // Text to encode
            scale: 3, // 3x scaling factor
            height: 7, // Bar height, in millimeters
            includetext: false,            // Show human-readable text
            textxalign:  'center',        // Always good to set this
        }, function (err, png) {
            if (err) {
                // `err` may be a string or Error object
            } else {
                //console.log(png.toString('base64'))

                let itemInfo = info;

                //itemInfo.bracodeImage = png.toString('base64');

                // return res.json(itemInfo.bracodeImage)
                // console.log(itemInfo)

                // return 0
                

                var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'reports', 'branch_manager_access_card.html'), 'utf8');

                    var options = {
                        format: "A4",
                        orientation: "portrait",
                        border: "5mm"
                    }
            
            
            
            
                    var document = {
                        html: html,
                        data: {
                            name: itemInfo.name,
                            phone: itemInfo.phone,
                            imageData: png.toString('base64'),
                            branches: itemInfo.branch,
                            companyInfo: config.get('company'),
                        },
                        path: "./public/reports/branch_manager_access.pdf"
                    };
            
                    pdf.create(document, options)
                        .then(data => {
                            const file = data.filename;
                            console.log(file)
                            return res.status(200).json({
                                auth: true,
                                fileLink: '/reports/branch_manager_access.pdf' 
                            })
                        })
                        .catch(error => {
                            console.error(error)
                        });
                // `png` is a Buffer
                // png.length           : PNG file length
                // png.readUInt32BE(16) : PNG image width
                // png.readUInt32BE(20) : PNG image height
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router