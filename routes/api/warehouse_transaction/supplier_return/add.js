const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const Product = require('../../../../models/WarehouseProduct');
const ReturnToSupplier = require('../../../../models/Tracking/WarehouseTransaction/ReturnToSupplier');

const GeneralJournal = require('../../../../models/Accounts/GeneralJournal');
const GeneralJournalDetails = require('../../../../models/Accounts/GeneralJournalDetails');
const ChartOfAccountsSubCategory = require('../../../../models/Accounts/Chart/SubCategory');
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
        check('supplier', 'Supplier is required').not().isEmpty(),
        check('totalQuantity', 'Total quantity is required').not().isEmpty(),
        check('totalAmount', 'Total amount is required').not().isEmpty(),
        check('products', 'Products is required').not().isEmpty()
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse transaction')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to transaction'
                    }
                ]
            })
        }

        let serialNo = 100000

        let { receivingID, supplier, purpose, remarks, products, totalAmount, totalQuantity } = req.body

        const lastSupplierReturn = await ReturnToSupplier.findOne({}).sort({create: -1})

        if(lastSupplierReturn){
            serialNo = lastSupplierReturn.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }

        
        const returnToSupplierInfo = new ReturnToSupplier({
            serialNo,
            receivingID,
            products,
            purpose,
            remarks,
            totalAmount,
            totalQuantity,
            supplier,
            admin: req.admin.id
        })

        let returnToSupplierSavedInfo = await returnToSupplierInfo.save()

        products.map(async productData =>{
            let productInfo = await Product.findById(productData._id)

            let productInfoStockUpdate = await Product.findOne({
                _id: productData._id,
                "daily_transaction.date": {
                    $gte: from,
                    $lte: to 
                }
            })

            if(!productInfoStockUpdate){
                productInfo.daily_transaction.push({
                    receiving: 0,
                    return: Number(productData.quantity),
                    disposal: 0
                })
            }else{
                productInfo.daily_transaction[productInfo.daily_transaction.length - 1].return += Number(productData.quantity)
            }

            if(productInfo.second_price.sell===Number(productData.price.sell)){
                productInfo.second_price.quantity -= Number(productData.quantity) 
            }else{
                productInfo.quantity -= Number(productData.quantity)
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

        let accountsSettingsInfo = await AccountsSchedulerSettings.findOne({
            branch: null
        })

        if(accountsSettingsInfo && accountsSettingsInfo.product_return.isActive){
            let subcategoryInfo = await ChartOfAccountsSubCategory.findOne({
                serialNo: accountsSettingsInfo.product_return.subcategorySerialNo
            }).select('_id group subgroup category')

            let categoryInfo = await ChartOfAccountsCategory.findOne({
                serialNo: accountsSettingsInfo.product_return.categorySerialNo
            }).select('_id group subgroup')

            let voucherInfo = await AccountsVoucher.findOne({
                serialNo: accountsSettingsInfo.product_return.voucherSerialNo
            }).select('_id')

            let currencyInfo = await AccountsCurrency.findOne({
                serialNo: accountsSettingsInfo.product_return.currencySerialNo
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
                debit_balance: totalAmount,
                closing_balance: totalAmount,
                is_updatable: false
            }

            const generalJournalInfoData = new GeneralJournal(generalJournalInfo)

            let responseJournalInfo = await generalJournalInfoData.save()

            let journalsInfo = []

            let generalJournalInfoDetails = [{
                isCredit: true,
                group: subcategoryInfo.group,
                subgroup: subcategoryInfo.subgroup,
                category: subcategoryInfo.category,
                subcategory: subcategoryInfo._id,
                slip: returnToSupplierSavedInfo.serialNo,
                voucher: voucherInfo._id,
                currency: currencyInfo._id,
                amount: totalAmount,
                narration: "product return to " + lastSupplierReturn.supplier.name,
                general_journal: responseJournalInfo._id,
                admin: req.admin.id
            },{
                isCredit: false,
                group: categoryInfo.group,
                subgroup: categoryInfo.subgroup,
                category: categoryInfo._id,
                slip: returnToSupplierSavedInfo.serialNo,
                supplier: supplier,
                voucher: voucherInfo._id,
                currency: currencyInfo._id,
                amount: totalAmount,
                narration: "product return to " + lastSupplierReturn.supplier.name,
                general_journal: responseJournalInfo._id,
                admin: req.admin.id
            }]

            await GeneralJournalDetails.insertMany(generalJournalInfoDetails)

            journalsInfo.push(generalJournalInfoDetails)
        } 
        
        res.status(200).json({
            msg: 'Product return to supplier is completed successfully',
            data: returnToSupplierInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router