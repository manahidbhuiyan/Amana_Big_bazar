const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const bwipjs = require('bwip-js');
var isodate = require("isodate");

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../middleware/admin/auth');

const ReturnToSupplier = require('../../../models/Tracking/Transaction/ReturnToSupplier');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');


// @route GET api/order
// @description Get all the orders
// @access Private
router.post('/supplier-wise-return', [
    auth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('supplier', 'Supplier id is required').not().isEmpty()
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        let {from, to, supplier} = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);


        let supplierReturnData = await ReturnToSupplier.find({
            supplier,
            branch: req.query.branch,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).populate('supplier', '_id name contact').populate('admin', 'name').populate('branch', 'name address')

        
        //return res.json(supplierReturnData)
        let allProducts = []
        let searchProductIndex = []
        let totalSealValue = 0
        let totalQuantity = 0
        let totalAmount = 0
        let supplierArrayMainLoop = supplierReturnData.map((productList, index)=>{
            productList.products.map((productInfo, index)=>{
                if(searchProductIndex.includes(productInfo.barcode)){
                    var productIndex = searchProductIndex.indexOf(productInfo.barcode);
                    var previousQuantity = Number(allProducts[productIndex].quantity);
                    totalSealValue += (productInfo.price.sell * productInfo.quantity)
                    allProducts[productIndex].quantity = (Number(allProducts[productIndex].quantity) + productInfo.quantity).toFixed(2)
                    allProducts[productIndex].stock = (Number(productInfo.stock)).toFixed(2)
                    allProducts[productIndex].sell = (((Number(allProducts[productIndex].sell)*previousQuantity) + (Number(productInfo.price.sell)*productInfo.quantity))/Number(allProducts[productIndex].quantity)).toFixed(2) 
                    allProducts[productIndex].purchase = (((Number(allProducts[productIndex].purchase)*previousQuantity) + (productInfo.price.purchase*productInfo.quantity))/Number(allProducts[productIndex].quantity)).toFixed(2)  
                    allProducts[productIndex].total = (Number(allProducts[productIndex].quantity) * Number(allProducts[productIndex].purchase)).toFixed(2) 
                    
                    totalAmount += productInfo.total
                    totalQuantity += productInfo.quantity
                }else{
                    totalSealValue += (productInfo.price.sell * productInfo.quantity)
                    allProducts.push({
                        serial: allProducts.length + 1,
                        barcode: productInfo.barcode,
                        name: productInfo.name,
                        stock: (productInfo.stock==null?0:productInfo.stock).toFixed(2),
                        sell: (productInfo.price.sell).toFixed(2),
                        quantity: (productInfo.quantity).toFixed(2),
                        purchase: (productInfo.price.purchase).toFixed(2),
                        total: (productInfo.total).toFixed(2)
                    })

                    totalAmount += productInfo.total
                    totalQuantity += productInfo.quantity
                    searchProductIndex.push(productInfo.barcode)
                }
            })
        })

        await Promise.all(supplierArrayMainLoop)
        

        let allDataInfo = {}

        allDataInfo.totalSealValue = totalSealValue.toFixed(2)
        allDataInfo.totalQuantity = totalQuantity.toFixed(2)
        allDataInfo.fromDate = from.getDate()+'-' + (from.getMonth()+1) + '-'+from.getFullYear()
        allDataInfo.toDate = to.getDate()+'-' + (to.getMonth()+1) + '-'+to.getFullYear()
        allDataInfo.totalCostAmount = totalAmount.toFixed(2)
        //allDataInfo.serialNo = supplierReturnData.serialNo
        allDataInfo.branchName = supplierReturnData[0].branch.name
        allDataInfo.branchAddress = supplierReturnData[0].branch.address
        allDataInfo.supplierName = supplierReturnData[0].supplier.name
        allDataInfo.supplierAddress = supplierReturnData[0].supplier.contact.address

        // if(supplierReturnData.requisitionID){
        //     let requisitionToSupplierData = await RequisitionToSupplier.findById(supplierReturnData.requisitionID).select('_id').populate('admin', 'name')
        //     allDataInfo.postedBy = requisitionToSupplierData.admin.name
        // }else{
        //     allDataInfo.postedBy = supplierReturnData.admin.name
        // }

        // allDataInfo.receivedBy = supplierReturnData[].admin.name
        
        allDataInfo.products = allProducts

        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'supplier', 'supplier_return.html'), 'utf8');

                        var options = {
                            format: "A4",
                            orientation: "portrait",
                            border: "5mm"
                        }
                
                        var document = {
                            html: html,
                            data: allDataInfo,
                            path: "./public/reports/supplier_return.pdf"
                        };
                
                        pdf.create(document, options)
                            .then(data => {
                                const file = data.filename;
                                console.log(file)
                                return res.status(200).json({
                                    auth: true,
                                    fileLink: '/reports/supplier_return.pdf' 
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