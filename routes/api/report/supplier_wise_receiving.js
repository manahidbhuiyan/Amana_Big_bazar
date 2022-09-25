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

const ReceiveFromSupplier = require('../../../models/Tracking/Transaction/ReceiveFromSupplier');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');


// @route GET api/order
// @description Get all the orders
// @access Private
router.post('/supplier-wise-receiving', [
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


        let supplierRecevingData = await ReceiveFromSupplier.find({
            supplier,
            branch: req.query.branch,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).populate('supplier', '_id name contact').populate('admin', 'name').populate('branch', 'name address')

        let allProducts = []
        let searchProductIndex = []
        let totalSealValue = 0
        let totalFreeQuantity = 0
        let totalQuantity = 0
        let totalAmount = 0
        supplierRecevingData.map((productList, index)=>{
            productList.products.map((productInfo, index)=>{
                if(searchProductIndex.includes(productInfo.product.barcode)){
                    var productIndex = searchProductIndex.indexOf(productInfo.product.barcode);
                    var previousQuantity = Number(allProducts[productIndex].quantity);
                    totalSealValue += (productInfo.product.price.sell * productInfo.product.quantity)
                    allProducts[productIndex].quantity = (Number(allProducts[productIndex].quantity) + productInfo.product.quantity).toFixed(2)
                    allProducts[productIndex].stock = (Number(productInfo.product.stock)).toFixed(2)
                    allProducts[productIndex].free = (Number(allProducts[productIndex].free) + productInfo.product.free).toFixed(2)
                    allProducts[productIndex].sell = (((Number(allProducts[productIndex].sell)*previousQuantity) + (Number(productInfo.product.price.sell)*productInfo.product.quantity))/Number(allProducts[productIndex].quantity)).toFixed(2) 
                    allProducts[productIndex].purchase = (((Number(allProducts[productIndex].purchase)*previousQuantity) + (productInfo.product.price.purchase*productInfo.product.quantity))/Number(allProducts[productIndex].quantity)).toFixed(2)  
                    allProducts[productIndex].total = (Number(allProducts[productIndex].quantity) * Number(allProducts[productIndex].purchase)).toFixed(2) 
                    
                    totalAmount += productInfo.product.total
                    totalQuantity += productInfo.product.quantity
                    totalFreeQuantity += productInfo.product.free
                }else{
                    totalSealValue += (productInfo.product.price.sell * productInfo.product.quantity)
                    allProducts.push({
                        serial: allProducts.length + 1,
                        barcode: productInfo.product.barcode,
                        name: productInfo.product.name,
                        stock: (productInfo.product.stock==null?0:productInfo.product.stock).toFixed(2),
                        sell: (productInfo.product.price.sell).toFixed(2),
                        quantity: (productInfo.product.quantity).toFixed(2),
                        purchase: (productInfo.product.price.purchase).toFixed(2),
                        free: (productInfo.product.free).toFixed(2),
                        total: (productInfo.product.total).toFixed(2)
                    })

                    totalAmount += productInfo.product.total
                    totalQuantity += productInfo.product.quantity
                    totalFreeQuantity += productInfo.product.free
                    searchProductIndex.push(productInfo.product.barcode)
                }
            })
        })

        

        let allDataInfo = {}

        allDataInfo.totalSealValue = totalSealValue.toFixed(2)
        allDataInfo.totalQuantity = totalQuantity.toFixed(2)
        allDataInfo.fromDate = from.getDate()+'-' + (from.getMonth()+1) + '-'+from.getFullYear()
        allDataInfo.toDate = to.getDate()+'-' + (to.getMonth()+1) + '-'+to.getFullYear()
        allDataInfo.totalCostAmount = totalAmount.toFixed(2)
        //allDataInfo.serialNo = supplierRecevingData.serialNo
        allDataInfo.branchName = supplierRecevingData[0].branch.name
        allDataInfo.branchAddress = supplierRecevingData[0].branch.address
        allDataInfo.supplierName = supplierRecevingData[0].supplier.name
        allDataInfo.supplierAddress = supplierRecevingData[0].supplier.contact.address

        // if(supplierRecevingData.requisitionID){
        //     let requisitionToSupplierData = await RequisitionToSupplier.findById(supplierRecevingData.requisitionID).select('_id').populate('admin', 'name')
        //     allDataInfo.postedBy = requisitionToSupplierData.admin.name
        // }else{
        //     allDataInfo.postedBy = supplierRecevingData.admin.name
        // }

        // allDataInfo.receivedBy = supplierRecevingData[].admin.name
        allDataInfo.totalFreeQuantity = totalFreeQuantity.toFixed(2)
        
        allDataInfo.products = allProducts

        return res.json(allDataInfo)

        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'supplier', 'supplier_receive.html'), 'utf8');

                        var options = {
                            format: "A4",
                            orientation: "portrait",
                            border: "5mm"
                        }
                
                        var document = {
                            html: html,
                            data: allDataInfo,
                            path: "./public/reports/supplier_receive.pdf"
                        };
                
                        pdf.create(document, options)
                            .then(data => {
                                const file = data.filename;
                                console.log(file)
                                return res.status(200).json({
                                    auth: true,
                                    fileLink: '/reports/supplier_receive.pdf' 
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