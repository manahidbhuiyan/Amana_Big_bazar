const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const Product = require('../../../../models/Product');
const Branch = require('../../../../models/Branch');
const WarehouseProduct = require('../../../../models/WarehouseProduct');
const RequisitionToSupplier = require('../../../../models/Tracking/WarehouseSupply/ReturnSupplierWise');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route POST api/supplier/product-requisition
// @description Add new request to supplier
// @access Private
router.post('/return/', [auth, 
    [
        check('supplier', 'Supplier is required').not().isEmpty(),
        check('totalQuantity', 'Total quantity is required').not().isEmpty(),
        check('totalAmount', 'Total amount is required').not().isEmpty(),
        check('products', 'Products is required').not().isEmpty(),
        check('branch', 'Branch is required').not().isEmpty()
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'supply')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to supply'
                    }
                ]
            })
        }

        const { requisitionNo, products, supplier, totalQuantity, totalAmount, branch } = req.body

        let branchInfo = await Branch.findById(branch).select('_id name serialNo')

        if(requisitionNo != null && requisitionNo != ''){
            const checkReturnDone = await RequisitionToSupplier.findOne({
                returnNo: requisitionNo
            })

            if (checkReturnDone) {
                return res.status(400).send({
                    errors: [
                        {
                            msg: 'This return from branch has been already completed'
                        }
                    ]
                })
            }
        }

        let checkProductExistLoop = products.map(async productData =>{
            let productExsistInBranch = await WarehouseProduct.findOne({
                barcode: productData.product.barcode
            })


            if(!productExsistInBranch){
                let productInfo = await Product.findOne({
                    branch: branchInfo._id,
                    barcode: productData.product.barcode
                });

                let productSerialNo =  Number(String(branchInfo.serialNo)+10000)

                const lastSerialProductInfo = await Product.findOne({
                    branch: branchInfo._id
                }).sort({create: -1})
        
                if(lastSerialProductInfo){
                    productSerialNo = lastSerialProductInfo.serialNo + 1
                }else{
                    productSerialNo = productSerialNo + 1
                } 
        
                const addProductInfo = new WarehouseProduct({
                    serialNo: productSerialNo,
                    branch: branchInfo._id,
                    category: productInfo.category,
                    subcategory: productInfo.subcategory,
                    brand: productInfo.brand,
                    supplier: productInfo.supplier,
                    barcode: productInfo.barcode,
                    name: productInfo.name,
                    slug: productInfo.slug,
                    newProduct: productInfo.newProduct,
                    specialOffer: productInfo.specialOffer,
                    bestSell: productInfo.bestSell,
                    "price.sell": productInfo.price.sell,
                    "price.purchase": productInfo.price.purchase,
                    vat: productInfo.vat,
                    returnNo: productInfo.returnNo,
                    sold: productInfo.sold,
                    description: productInfo.description,
                    expireDate: productInfo.expireDate,
                    reorderLevel : productInfo.reorderLevel,
                    weight : productInfo.weight,
                    unitType : productInfo.unitType,
                    availableSize : productInfo.availableSize,
                    active : productInfo.active,
                    created_by: req.admin.id
                })
        
                await addProductInfo.save()
            }
        })

        await Promise.all(checkProductExistLoop)

        let serialNo =  Number(String(branchInfo.serialNo)+100000)

        const lastSupplierRequisition = await RequisitionToSupplier.findOne({branch:branchInfo._id}).sort({create: -1})

        if(lastSupplierRequisition){
            serialNo = lastSupplierRequisition.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }

        const requisitionToSupplierInfo = new RequisitionToSupplier({
            returnNo: requisitionNo,
            serialNo,
            products,
            supplier,
            totalQuantity,
            totalAmount,
            admin: req.admin.id,
            branch: branchInfo._id
        })

        await requisitionToSupplierInfo.save()

        let productQuantityUpdateLoop = products.map(async productData =>{
            let productInfo = await WarehouseProduct.findOne({
                barcode: productData.product.barcode
            })

            if(productInfo.second_price.sell===Number(productData.product.price.sell)){
                productInfo.second_price.quantity -= Number(productData.product.quantity) 
            }else{
                productInfo.quantity += Number(productData.product.quantity)
            }
            
            await productInfo.save()
        })

        await Promise.all(productQuantityUpdateLoop);

        res.status(200).json({
            msg: 'Receiving from branch is completed successfully',
            data: requisitionToSupplierInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router