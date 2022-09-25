const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

var isodate = require("isodate");

const auth = require('../../../../middleware/admin/auth');
const Product = require('../../../../models/WarehouseProduct');
const ReceivingFromSupplier = require('../../../../models/Tracking/WarehouseTransaction/ReceiveFromSupplier');

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
        check('chalan_no', 'Chalan no is required').not().isEmpty(),
        check('chalan_date', 'Chalan date is required').not().isEmpty(),
        check('payment_date', 'Payment date is required').not().isEmpty(),
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
                        msg: 'Account is not authorized to warehouse transaction'
                    }
                ]
            })
        }

        let serialNo = 100000

        let { requisitionID, chalan_no, chalan_date, payment_date, products, applyDiscount, totalFreeQuantity, totalAmount, totalQuantity, supplier } = req.body

        const lastSupplierReceiving = await ReceivingFromSupplier.findOne({}).sort({create: -1})

        if(lastSupplierReceiving){
            serialNo = lastSupplierReceiving.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }

        chalan_date = new Date(chalan_date)
        payment_date = new Date(payment_date)

        const receivingFromSupplierInfo = new ReceivingFromSupplier({
            serialNo,
            requisitionID,
            chalan_no,
            chalan_date: isodate(chalan_date),
            payment_date,
            products,
            applyDiscount,
            totalFreeQuantity,
            totalAmount,
            totalQuantity,
            supplier,
            admin: req.admin.id
        })

        let savedReceivingFromSupplierInfo = await receivingFromSupplierInfo.save()

        products.map(async productData =>{
            let productInfo = await Product.findById(productData.product._id)

            let productInfoStockUpdate = await Product.findOne({
                _id: productData.product._id,
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

        let accountsSettingsInfo = await AccountsSchedulerSettings.findOne({
            branch: null
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
                currency: currencyInfo._id,
                amount: totalAmount - applyDiscount,
                narration: "goods received from " + lastSupplierReceiving.supplier.name,
                general_journal: responseJournalInfo._id,
                admin: req.admin.id
            }]

            await GeneralJournalDetails.insertMany(generalJournalInfoDetails)
            // let generalJournalInfoDetailsData = new GeneralJournalDetails(generalJournalInfoDetails)

            // await generalJournalInfoDetailsData.save()

            journalsInfo.push(generalJournalInfoDetails)
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