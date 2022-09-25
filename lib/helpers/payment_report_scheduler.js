const { fork } = require('child_process')

var path = require('path');
const slugify = require('slugify');
const Group = require('../../models/Accounts/Chart/Group');
const SubGroup = require('../../models/Accounts/Chart/SubGroup');
const Category = require('../../models/Accounts/Chart/Category');
const SubCategory = require('../../models/Accounts/Chart/SubCategory');
const SchedulerSettings = require('../../models/Accounts/Settings/SchedulerSettings');
const AccountsVoucher = require('../../models/Accounts/Settings/Voucher');
const AccountsCurrency = require('../../models/Accounts/Settings/Currency');
const GeneralJournal = require('../../models/Accounts/GeneralJournal');
const GeneralJournalDetails = require('../../models/Accounts/GeneralJournalDetails');

let paymentReportScheduler = async (branchID) => {
    try {
        let from = new Date()
        from.setDate(from.getDate() - 1)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        let to = new Date()
        to.setDate(to.getDate() - 1)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);

        const child = fork(path.join(__dirname, "..", "..", "routes", "api", "report", "subprocess", "payment_report.js"));

        const msg = {
            from,
            to,
            branch: branchID,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allSellerSellsInfo,
                grandTotal
            } = response

            let branch_payments = []
            let parentArray = allSellerSellsInfo.map(async branchWiseInfo=>{
                let childArray = branchWiseInfo.payments.map(async paymentInfo=>{
                    let payIndex = null
                    let branchData  = branch_payments.filter((payInfo, index)=>{
                        if(payInfo.type == paymentInfo[0]){
                            payIndex = index
                            return payInfo
                        }
                    })
                    
                    if(branchData.length>0){
                        branch_payments[payIndex].amount += paymentInfo[1]
                    }else{
                        branch_payments.push({
                            type: paymentInfo[0],
                            amount: paymentInfo[1]
                        })
                    }
                })
                await Promise.all(childArray)
            })
            await Promise.all(parentArray)

            const branchSchedulerInfo = await SchedulerSettings.findOne({
                branch: branchID
            }).select('sell')

            if(branchSchedulerInfo && branchSchedulerInfo.sell.isActive){
                const creditSubcategoryInfo = await SubCategory.findOne({
                    serialNo: branchSchedulerInfo.sell.crsubcategorySerialNo
                }).select('group subgroup category')

                const groupInfo = await Group.findOne({
                    serialNo: branchSchedulerInfo.sell.degroupSerialNo
                }).select("_id")

                const subgroupInfo = await SubGroup.findOne({
                    serialNo: branchSchedulerInfo.sell.desubgroupSerialNo
                }).select("_id")

                const categoryInfo = await Category.findOne({
                    serialNo: branchSchedulerInfo.sell.decategorySerialNo
                }).select("_id")

                const voucherInfo = await AccountsVoucher.findOne({
                    serialNo: branchSchedulerInfo.sell.voucherSerialNo
                }).select("_id")

                const currencyInfo = await AccountsCurrency.findOne({
                    serialNo: branchSchedulerInfo.sell.currencySerialNo
                }).select("_id")

    
                branch_payments.map(async paymentInfo=>{
                    // console.log(paymentInfo.type)
                    let debitSubcategoryInfo = await SubCategory.findOne({
                        group: groupInfo._id,
                        subgroup: subgroupInfo._id,
                        category: categoryInfo._id,
                        name: paymentInfo.type.trim(),
                    }).select("_id")

                    if(!debitSubcategoryInfo){
                        let serialNo = 100

                        const lastSerialInfo = await SubCategory.findOne().sort({create: -1})

                        if(lastSerialInfo){
                            serialNo = lastSerialInfo.serialNo + 1
                        }else{
                            serialNo = serialNo + 1
                        }

                        let slug = slugify(paymentInfo.type)

                        let subCategoryInfoDetails = {
                            group: groupInfo._id,
                            subgroup: subgroupInfo._id,
                            category: categoryInfo._id,
                            serialNo,
                            name: paymentInfo.type.trim(),
                            slug: slug.toLowerCase().trim(),
                            opening_balance: 0
                        }
                
                        const subcategoryInfo = new SubCategory(subCategoryInfoDetails)
                        debitSubcategoryInfo = await subcategoryInfo.save()
                    }

                    let serialGeneralJournalNo = 100
        
                    const lastGeneralJournalSerialInfo = await GeneralJournal.findOne().sort({create: -1})
        
                    if(lastGeneralJournalSerialInfo){
                        serialGeneralJournalNo = lastGeneralJournalSerialInfo.serialNo + 1
                    }else{
                        serialGeneralJournalNo = serialGeneralJournalNo + 1
                    }
        
                    let generalJournalInfo = {
                        serialNo: serialGeneralJournalNo,
                        credit_balance: paymentInfo.amount,
                        debit_balance: paymentInfo.amount,
                        closing_balance: paymentInfo.amount - paymentInfo.amount,
                        is_updatable: false
                    }
        
                    const generalJournalInfoData = new GeneralJournal(generalJournalInfo)
        
                    let responseJournalInfo = await generalJournalInfoData.save()
        
                    let journalsInfo = []
        
                    let generalJournalInfoDetails = [{
                        isCredit: true,
                        group: creditSubcategoryInfo.group,
                        subgroup: creditSubcategoryInfo.subgroup,
                        category: creditSubcategoryInfo.category,
                        subcategory: creditSubcategoryInfo._id,
                        slip: "",
                        record_date: to,
                        voucher: voucherInfo._id,
                        cost_center: branchID,
                        currency: currencyInfo._id,
                        amount: paymentInfo.amount,
                        narration: "product sold to customers by "+ paymentInfo.type,
                        general_journal: responseJournalInfo._id
                    },{
                        isCredit: false,
                        group: groupInfo._id,
                        subgroup: subgroupInfo._id,
                        category: categoryInfo._id,
                        subcategory: debitSubcategoryInfo._id,
                        slip: "",
                        record_date: to,
                        voucher: voucherInfo._id,
                        cost_center: branchID,
                        currency: currencyInfo._id,
                        amount: paymentInfo.amount,
                        narration: "product sold to customers by "+ paymentInfo.type,
                        general_journal: responseJournalInfo._id
                    }]
        
                    await GeneralJournalDetails.insertMany(generalJournalInfoDetails)
        
                    journalsInfo = generalJournalInfoDetails
                })
            }
        })
        child.on('close', (code) => {
            child.kill()
            console.log(`child process exited with code ${code}`);
        });

    } catch (err) {
        console.error(err);
    }
};

module.exports = paymentReportScheduler