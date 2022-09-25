const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const WarehouseProduct = require('../../../../models/WarehouseProduct');
const RequisitionToSupplier = require('../../../../models/Tracking/WarehouseSupply/RequisitionWiseSupply');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route POST api/supplier/product-requisition
// @description Add new request to supplier
// @access Private
router.post('/', [auth, 
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

        if(requisitionNo != null && requisitionNo != ''){
            const checkReturnDone = await RequisitionToSupplier.findOne({
                requisitionNo
            })
    
            if (checkReturnDone) {
                return res.status(400).send({
                    errors: [
                        {
                            msg: 'This requisition from branch has been supplied from warehouse'
                        }
                    ]
                })
            }
        }

        let flag = 0

        let checkProductListLoop = products.map(async (productData, index) =>{
            let productInfo = await WarehouseProduct.findOne({barcode: productData.product.barcode})

            if(!productInfo){
                flag = 1

                return res.status(400).send({
                    errors: [
                        {
                            msg: '"'+productData.product.name + '" branch barcode and warehouse barcode not matched'
                        }
                    ]
                })
            }

            if(productInfo.quantity<productData.product.quantity){
                flag = 1

                return res.status(400).send({
                    errors: [
                        {
                            msg: '"'+productData.product.name + '" do not have enough quantity in warehouse stock'
                        }
                    ]
                })
            }
        })

        await Promise.all(checkProductListLoop)

        if(flag==0){
            let serialNo =  Number(String(branch.serialNo)+100000)

            const lastSupplierRequisition = await RequisitionToSupplier.findOne({branch:branch._id}).sort({create: -1})

            if(lastSupplierRequisition){
                serialNo = lastSupplierRequisition.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }

            const requisitionToSupplierInfo = new RequisitionToSupplier({
                requisitionNo,
                serialNo,
                products,
                supplier,
                totalQuantity,
                totalAmount,
                admin: req.admin.id,
                branch: branch._id
            })

            await requisitionToSupplierInfo.save()

            products.map(async productData =>{
                let productInfo = await WarehouseProduct.findOne({barcode: productData.product.barcode})

                if(productInfo.second_price.sell===Number(productData.product.price.sell)){
                    productInfo.second_price.quantity -= Number(productData.product.quantity) 
                }else{
                    productInfo.quantity -= Number(productData.product.quantity)
                }

                if(productInfo.quantity == 0 && productInfo.second_price.quantity > 0){
                    productInfo.quantity += productInfo.second_price.quantity
                    productInfo.price = {
                        purchase: productInfo.second_price.purchase,
                        sell: productInfo.second_price.sell
                    }

                    productInfo.second_price = {
                        quantity: 0,
                        sell: 0,
                        purchase: 0
                    }
                }
                
                await productInfo.save()
            })

            res.status(200).json({
                msg: 'New supply to branch added successfully',
                data: requisitionToSupplierInfo
            })
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router