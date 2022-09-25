const express = require('express');
const router = express.Router();

const config = require('config')

var isodate = require("isodate");
var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../../middleware/admin/auth');
const ProductDiscount = require('../../../../models/Tracking/Transaction/ProductDiscount');
const Product = require('../../../../models/Product');
const Branch = require('../../../../models/Branch');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route GET api/supplier
// @description Get all the subcategories
// @access Private
router.post('/discount/details', auth, async (req, res) => {
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'report')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to report'
                    }
                ]
            })
        }

    try {

        let {from, to} = req.body

        let condition = {}

        if(req.query.branch !== undefined)
        {
            condition.branch = req.query.branch
        }

        
        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59)
        to.setSeconds(59)

        condition.create = {
            $gte: isodate(from),
            $lte: isodate(to)
        }
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        let productOperations = await ProductDiscount.find(condition).sort({create:'desc'}).populate('admin', 'name')

        // let allDataItems = [];

        // let grandTotalQuantity = 0
        // let grandTotalCostAmount = 0
        // let grandTotalSaleAmount = 0

        // let productOperationsArray = productOperations.map(async singleOperation=>{
        //     let allDataProductsItems = []
        //     let totalQuantity = 0
        //     let totalCostAmount = 0
        //     let totalSaleAmount = 0
        //     let productOperationChildArray = singleOperation.products.map(async productInfo=>{

        //         let productSupplier = await Product.findOne({
        //             barcode: productInfo.barcode,
        //             branch: req.query.branch
        //         }).populate('supplier', 'name').select('id expireDate')


        //         allDataProductsItems.push([
        //             productInfo.name,
        //             productSupplier.supplier.name,
        //             productSupplier.expireDate==null?'-': (("0" + productSupplier.expireDate.getDate()).slice(-2) + ' ' + months[productSupplier.expireDate.getMonth()] + ', ' + productSupplier.expireDate.getUTCFullYear()),
        //             productInfo.price.purchase,
        //             productInfo.price.sell,
        //             (productInfo.disposal).toFixed(2),
        //             (productInfo.price.purchase * productInfo.disposal).toFixed(2),
        //             (productInfo.price.sell * productInfo.disposal).toFixed(2)
        //         ])

        //         totalQuantity += productInfo.disposal
        //         totalCostAmount += productInfo.price.purchase * productInfo.disposal
        //         totalSaleAmount += productInfo.price.sell * productInfo.disposal
        //     })

        //     await Promise.all(productOperationChildArray)
        //     allDataItems.push({
        //         serialNo: singleOperation.serialNo,
        //         admin: singleOperation.admin.name,
        //         create:  ("0" + singleOperation.create.getDate()).slice(-2) + ' ' + months[singleOperation.create.getMonth()] + ', ' + singleOperation.create.getUTCFullYear()+ ' ' + singleOperation.create.getHours()+':'+singleOperation.create.getMinutes(),
        //         products: allDataProductsItems,
        //         totalQuantity: totalQuantity.toFixed(2),
        //         totalCostAmount: totalCostAmount.toFixed(2),
        //         totalSaleAmount: totalSaleAmount.toFixed(2)
        //     })  

        //     grandTotalQuantity += totalQuantity
        //     grandTotalCostAmount += totalCostAmount
        //     grandTotalSaleAmount += totalSaleAmount
        // })

        // await Promise.all(productOperationsArray)

        // let branch = await Branch.findById(req.query.branch).select('_id name address serialNo');

        // let reportFullDataset = {
        //     fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
        //     toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
        //     branch_id: branch.serialNo,
        //     branch_name: branch.name.trim(),
        //     branch_address: branch.address.trim(),
        //     data: allDataItems,
        //     grandTotalQuantity: grandTotalQuantity.toFixed(2),
        //     grandTotalCostAmount: grandTotalCostAmount.toFixed(2),
        //     grandTotalSaleAmount: grandTotalSaleAmount.toFixed(2)
        // }

        return res.json(productOperations)

        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'disposal', 'disposal_details_date_wise.html'), 'utf8');

        var options = {
            format: "A4",
            orientation: "landscape",
            border: "10mm"
        }

        var document = {
            html: html,
            data: reportFullDataset,
            path: "./public/reports/disposal_details_date_wise.pdf"
        };

        pdf.create(document, options)
            .then(data => {
                const file = data.filename;
                return res.status(200).json({
                    auth: true,
                    fileLink: '/reports/disposal_details_date_wise.pdf' 
                })
            })
            .catch(error => {
                console.error(error)
            });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


module.exports = router