const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const ProductDisposal = require('../../../../models/Tracking/Transaction/ProductDisposal');
const Product = require('../../../../models/Product');

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


        const { products, reason, remarks, branch } = req.body
        let customErrors = []

        let serialNo =  Number(String(branch.serialNo)+100000)

        const lastProductDisposalInfo = await ProductDisposal.findOne({branch:branch.id}).sort({create: -1})

        if(lastProductDisposalInfo){
            serialNo = lastProductDisposalInfo.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }
        
        //check stock to stop create negative stock
        let checkProductStock = products.map(async productData =>{
            let productInfo = await Product.findOne({
                barcode: productData.barcode,
                branch: branch.id
            })
           
            if(productInfo != null){
                if(productInfo.quantity < productData.disposal){
                    customErrors.push({
                        msg: 'Stock quantity(' + productInfo.quantity + ') is lower than Dispose qunatity(' + productData.disposal + ') for ' + productData.name
                    })
                }
            }
            
        })

        await Promise.all(checkProductStock)

        if(customErrors.length > 0){
            return res.status(400).send({
                errors: customErrors
            })
        }

        const productDisposalInfo = new ProductDisposal({
            serialNo,
            products,
            reason,
            remarks,
            admin: req.admin.id,
            branch: branch.id
        })

        await productDisposalInfo.save()

        await products.map(async productInfo=>{
            let productInfoData = await Product.findById(productInfo._id)

            let productInfoStockUpdate = await Product.findOne({
                _id: productInfo._id,
                "daily_transaction.date": {
                    $gte: from,
                    $lte: to 
                }
            })

            if(!productInfoStockUpdate){
                productInfoData.daily_transaction.push({
                    receiving: 0,
                    return: 0,
                    disposal: Number(productInfo.disposal)
                })
            }else{
                productInfoData.daily_transaction[productInfoData.daily_transaction.length - 1].disposal += Number(productInfo.disposal)
            }

            productInfoData.quantity = productInfoData.quantity - Number(productInfo.disposal)
            productInfoData.disposal = productInfo.disposal

            if(productInfoData.quantity == 0 && productInfoData.second_price.quantity > 0){
                productInfoData.quantity += productInfoData.second_price.quantity
                productInfoData.price = {
                    purchase: productInfoData.second_price.purchase,
                    sell: productInfoData.second_price.sell
                }

                productInfoData.second_price = {
                    quantity: 0,
                    sell: 0,
                    purchase: 0
                }
            }

            await productInfoData.save()
        })

        let accountsSettingsInfo = await AccountsSchedulerSettings.findOne({}).sort({create: -1})
        
        if(accountsSettingsInfo && accountsSettingsInfo.product_disposal.isActive){
            let subcategoryInfo = await ChartOfAccountsSubCategory.findOne({
                serialNo: accountsSettingsInfo.product_disposal.subcategorySerialNo
            }).select('_id group subgroup category')
    
            let voucherInfo = await AccountsVoucher.findOne({
                serialNo: accountsSettingsInfo.product_disposal.voucherSerialNo
            }).select('_id')
    
            let currencyInfo = await AccountsCurrency.findOne({
                serialNo: accountsSettingsInfo.product_disposal.currencySerialNo
            }).select('_id')
    
            let serialGeneralJournalNo = 100
    
            const lastGeneralJournalSerialInfo = await GeneralJournal.findOne().sort({create: -1})
    
            if(lastSerialInfo){
                serialGeneralJournalNo = lastGeneralJournalSerialInfo.serialNo + 1
            }else{
                serialGeneralJournalNo = serialGeneralJournalNo + 1
            }
    
            let generalJournalInfo = {
                serialNo: serialGeneralJournalNo,
                credit_balance: 0,
                debit_balance: totalAmount - applyDiscount,
                closing_balance: totalAmount - applyDiscount
            }
    
            const generalJournalInfoData = new GeneralJournal(generalJournalInfo)
    
            let responseJournalInfo = await generalJournalInfoData.save()
    
            let journalsInfo = []
    
            let generalJournalInfoDetails = {
                isCredit: false,
                group: subcategoryInfo.group,
                subgroup: subcategoryInfo.subgroup,
                category: subcategoryInfo.category,
                subcategory: subcategoryInfo._id,
                slip: savedReceivingFromSupplierInfo.serialNo,
                supplier: savedReceivingFromSupplierInfo._id,
                voucher: voucherInfo._id,
                cost_center: branch.id,
                currency: currencyInfo._id,
                amount: totalAmount - applyDiscount,
                narration: remarks,
                general_journal: responseJournalInfo._id,
                admin: req.admin.id
            }
    
            let generalJournalInfoDetailsData = new GeneralJournalDetails(generalJournalInfoDetails)
    
            await generalJournalInfoDetailsData.save()
    
            journalsInfo.push(generalJournalInfoDetailsData)
    
            let de_subcategory_info = await ChartOfAccountsSubCategory.findById(journals[0].subcategory)
            de_subcategory_info.de_amount = de_subcategory_info.de_amount + journals[0].amount
    
            await de_subcategory_info.save()
        }
        
        res.status(200).json({
            msg: 'New disposals are added successfully',
            data: productDisposalInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router