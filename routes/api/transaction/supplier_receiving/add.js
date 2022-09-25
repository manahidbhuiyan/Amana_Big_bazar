const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

var isodate = require("isodate");

const auth = require('../../../../middleware/admin/auth');
const Product = require('../../../../models/Product');
const WarehouseProduct = require('../../../../models/WarehouseProduct');
const ReceivingFromSupplier = require('../../../../models/Tracking/Transaction/ReceiveFromSupplier');
const RequisitionToSupplier = require('../../../../models/Tracking/Transaction/RequisitionToSupplier');
const GeneralJournal = require('../../../../models/Accounts/GeneralJournal');
const GeneralJournalDetails = require('../../../../models/Accounts/GeneralJournalDetails');
const ChartOfAccountsSubCategory = require('../../../../models/Accounts/Chart/SubCategory');
const ChartOfAccountsCategory = require('../../../../models/Accounts/Chart/Category');
const AccountsVoucher = require('../../../../models/Accounts/Settings/Voucher');
const AccountsCurrency = require('../../../../models/Accounts/Settings/Currency');
const AccountsSchedulerSettings = require('../../../../models/Accounts/Settings/SchedulerSettings');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

let from = new Date()
from.setHours(0)
from.setMinutes (0);
from.setSeconds (0);
            
let to = new Date()
to.setHours(23)
to.setMinutes (59);
to.setSeconds (59);

// @route POST api/supplier/product-requisition
// @description Add new request to supplier
// @access Private
router.post('/', [auth, 
    [
        check('chalan_no', 'Chalan no is required').not().isEmpty(),
        check('chalan_date', 'Chalan date is required').not().isEmpty(),
        check('payment_date', 'Payment date is required').not().isEmpty(),
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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'transaction')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to transaction'
                    }
                ]
            })
        }


        let { requisitionID, chalan_no, chalan_date, payment_date, products, applyDiscount, totalFreeQuantity, totalAmount, totalQuantity, branch, supplier, loadedFromWarehouse, supplyID } = req.body
        let customErrors = []
        if(loadedFromWarehouse){
            if(requisitionID!="" && requisitionID !=null){
                let requisitionInfo = await RequisitionToSupplier.findOne({
                    serialNo: requisitionID
                }).select("_id")
                requisitionID = requisitionInfo._id
            }
        }

        let checkProductExistLoop = products.map(async productData =>{
            let productExsistInBranch = await Product.findOne({
                barcode: productData.product.barcode,
                branch: branch.id
            }).populate('supplier', 'name')


            if(!productExsistInBranch){
                let productInfo = await WarehouseProduct.findOne({
                    barcode: productData.product.barcode
                });

                let productSerialNo =  Number(String(branch.serialNo)+10000)

                const lastSerialProductInfo = await Product.findOne({
                    branch: branch.id
                }).sort({create: -1})
        
                if(lastSerialProductInfo){
                    productSerialNo = lastSerialProductInfo.serialNo + 1
                }else{
                    productSerialNo = productSerialNo + 1
                } 
        
                const addProductInfo = new Product({
                    serialNo: productSerialNo,
                    branch: branch.id,
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
                    vat: branch.vat_applicable_warehouse_receiving == true ? productInfo.vat : 0,
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
            }else{
                if(productExsistInBranch.supplier._id != supplier){
                    customErrors.push(
                        {
                            msg: 'Barcode is already used by ' + productExsistInBranch.supplier.name
                        }
                    )
                }   
            }
        })
        await Promise.all(checkProductExistLoop)

        if(customErrors.length > 0){
            return res.status(400).send({
                errors: customErrors
            })
        }

        let serialNo =  Number(String(branch.serialNo)+100000)

        const lastSupplierReceiving = await ReceivingFromSupplier.findOne({branch:branch.id}).populate('supplier', ['name']).sort({create: -1})

        if(lastSupplierReceiving){
            serialNo = lastSupplierReceiving.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }


        chalan_date = new Date(chalan_date)
        payment_date = new Date(payment_date)

        const receivingFromSupplierInfo = new ReceivingFromSupplier({
            serialNo,
            requisitionID: requisitionID=="" ? null : requisitionID,
            chalan_no,
            chalan_date: isodate(chalan_date),
            payment_date,
            products,
            applyDiscount,
            totalFreeQuantity,
            totalAmount,
            totalQuantity,
            supplier,
            admin: req.admin.id,
            branch: branch.id,
            fromWarehouse: loadedFromWarehouse,
            supplyInfo: supplyID=="" ? null : supplyID
        })

        let savedReceivingFromSupplierInfo = await receivingFromSupplierInfo.save()

        let updateProductDataLoop = products.map(async productData =>{
            let productInfo = await Product.findOne({
                barcode: productData.product.barcode,
                branch: branch.id,
                supplier : supplier
            })

            let productInfoStockUpdate = await Product.findOne({
                barcode: productData.product.barcode,
                branch: branch.id,
                supplier : supplier,
                "daily_transaction.date": {
                    $gte: from,
                    $lte: to 
                }
            })

            if(!productInfoStockUpdate){
                productInfo.daily_transaction.push({
                    receiving: Number(productData.product.quantity),
                    return: 0,
                    disposal: 0
                })
            }else{
                productInfo.daily_transaction[productInfo.daily_transaction.length - 1].receiving += Number(productData.product.quantity)
            }

            if(productInfo.quantity <= 0 || productInfo.price.sell===Number(productData.product.price.sell)){
                productInfo.price.purchase = Number(productData.product.price.purchase)
                productInfo.price.sell = Number(productData.product.price.sell)
                productInfo.quantity += Number(productData.product.quantity)
            }else{
                productInfo.second_price = {
                    quantity: productInfo.second_price.quantity + Number(productData.product.quantity),
                    sell: Number(productData.product.price.sell),
                    purchase: Number(productData.product.price.purchase),
                }
            }
            
            await productInfo.save()
        })

        await Promise.all(updateProductDataLoop)

        if(!loadedFromWarehouse){
            let accountsSettingsInfo = await AccountsSchedulerSettings.findOne({
                branch: branch.id
            })
           
            if(accountsSettingsInfo && accountsSettingsInfo.product_receiving.isActive){
                let subcategoryInfo = await ChartOfAccountsSubCategory.findOne({
                    serialNo: accountsSettingsInfo.product_receiving.subcategorySerialNo
                }).select('_id group subgroup category')

                let categoryInfo = await ChartOfAccountsCategory.findOne({
                    serialNo: accountsSettingsInfo.product_receiving.categorySerialNo
                }).select('_id group subgroup')
    
                let voucherInfo = await AccountsVoucher.findOne({
                    serialNo: accountsSettingsInfo.product_receiving.voucherSerialNo
                }).select('_id')
    
                let currencyInfo = await AccountsCurrency.findOne({
                    serialNo: accountsSettingsInfo.product_receiving.currencySerialNo
                }).select('_id')
    
                let serialGeneralJournalNo = 100
    
                const lastGeneralJournalSerialInfo = await GeneralJournal.findOne().sort({create: -1})
    
                if(lastGeneralJournalSerialInfo){
                    serialGeneralJournalNo = lastGeneralJournalSerialInfo.serialNo + 1
                }else{
                    serialGeneralJournalNo = serialGeneralJournalNo + 1
                }
    
                let generalJournalInfo = {
                    serialNo: serialGeneralJournalNo,
                    credit_balance: 0,
                    debit_balance: totalAmount - applyDiscount,
                    closing_balance: totalAmount - applyDiscount,
                    is_updatable: false
                }
    
                const generalJournalInfoData = new GeneralJournal(generalJournalInfo)
    
                let responseJournalInfo = await generalJournalInfoData.save()
    
                let journalsInfo = []
    
                let generalJournalInfoDetails = [{
                    isCredit: false,
                    group: subcategoryInfo.group,
                    subgroup: subcategoryInfo.subgroup,
                    category: subcategoryInfo.category,
                    subcategory: subcategoryInfo._id,
                    slip: savedReceivingFromSupplierInfo.serialNo,
                    voucher: voucherInfo._id,
                    cost_center: branch.id,
                    currency: currencyInfo._id,
                    amount: totalAmount - applyDiscount,
                    narration: "goods received from " + lastSupplierReceiving.supplier.name,
                    general_journal: responseJournalInfo._id,
                    admin: req.admin.id
                },{
                    isCredit: true,
                    group: categoryInfo.group,
                    subgroup: categoryInfo.subgroup,
                    category: categoryInfo._id,
                    slip: savedReceivingFromSupplierInfo.serialNo,
                    supplier: supplier,
                    voucher: voucherInfo._id,
                    cost_center: branch.id,
                    currency: currencyInfo._id,
                    amount: totalAmount - applyDiscount,
                    narration: "goods received from " + lastSupplierReceiving.supplier.name,
                    general_journal: responseJournalInfo._id,
                    admin: req.admin.id
                }]
    
                await GeneralJournalDetails.insertMany(generalJournalInfoDetails)
                // let generalJournalInfoDetailsData = new GeneralJournalDetails(generalJournalInfoDetails)
    
                // await generalJournalInfoDetailsData.save()
    
                journalsInfo = generalJournalInfoDetails
            } 
        } 
        
        res.status(200).json({
            msg: 'Product received from supplier is completed successfully',
            data: receivingFromSupplierInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router