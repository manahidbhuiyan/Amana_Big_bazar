// var mongoConnection = require('../../../../../../config/connectMongo')
// mongoConnection()
// const GeneralJournal = require('../../../../../../models/Accounts/GeneralJournalDetails')
// const Group = require('../../../../../../models/Accounts/Chart/Group')
// const Subgroup = require('../../../../../../models/Accounts/Chart/SubGroup')
// const Category = require('../../../../../../models/Accounts/Chart/Category')
// const Supplier = require('../../../../../../models/Supplier')
// const SubCategory = require('../../../../../../models/Accounts/Chart/SubCategory')

// process.on('message', async (msg) => {
//     let { prev, condition, type, from } = msg
//     from = new Date(from)
//     let allDataItems = []
//     let finalData = []
//     let trialBalanceTotalCredit = 0
//     let trialBalanceTotalDebit = 0
//     let trialBalanceTotalClosingBalance = 0
    
//     let journalsForTrialBalance = await GeneralJournal.find(condition).sort({ record_date: 'asc' })
//     .populate('group', 'name').populate('subgroup', 'name').populate('category', 'name').populate('subcategory', 'name opening_balance')
//     .populate('supplier', 'name branchWiseOpeningBalance')

//     let subcategories = await SubCategory.find({category : condition.category})

//     let groupInfo = await Group.findOne({
//         _id: condition.group
//     }).select('name')
//     let subgroupInfo = await Subgroup.findOne({
//         _id: condition.subgroup
//     }).select('name')
//     let categoryInfo = await Category.findOne({
//         _id: condition.category
//     }).select('name')

//     let subcategoriesArray = subcategories.map( async (subcategoryInfo) => {
//         let closingBalance = 0
//         let totalDebit = 0
//         let totalCredit = 0
//         if(groupInfo.name == 'owners equity' || groupInfo.name == 'liabilities' || groupInfo.name == 'assets'){
//             condition.record_date = {
//                 '$lte': prev
//             }
//             condition.subcategory = subcategoryInfo._id

//             let journalsForClosingBalance = await GeneralJournal.find(condition).select('isCredit amount')
//             if(journalsForClosingBalance.length > 0){
//                 let journalsForClosingBalanceArray = journalsForClosingBalance.map((journalInfo) => {
//                     if(journalInfo.isCredit){
//                         totalCredit += journalInfo.amount
//                     }else{
//                         totalDebit += journalInfo.amount
//                     }
//                 })
//                 await Promise.all(journalsForClosingBalanceArray)
            
//                 if(groupInfo.name == 'assets'){
//                     closingBalance += ( totalDebit - totalCredit) // closing balance for group asset
//                 }else if (groupInfo.name == 'liabilities'){
//                     closingBalance += ( totalCredit - totalDebit) // closing balance for group liabilities
//                 }else{
//                     closingBalance += ( totalCredit - totalDebit) // closing balance for group owners equity
//                 }
//             }
    
//         }

//         finalData.push({
//             particular : subcategoryInfo.name,
//             totalDebit : 0,
//             totalCredit : 0,
//             closingBalance : subcategoryInfo.opening_balance + closingBalance
//         })
//         trialBalanceTotalClosingBalance += subcategoryInfo.opening_balance + closingBalance
//     })
//     await Promise.all(subcategoriesArray)

//     let journalsForTrialBalanceArray = journalsForTrialBalance.map((journalInfo) => {
//         if(journalInfo.subcategory != null){
//             let subcategoryIndex = finalData.findIndex((subcategoryData) => subcategoryData.particular == journalInfo.subcategory.name)
//             if(groupInfo.name == 'owners equity' || groupInfo.name == 'liabilities'){
//                     // check if current journal is debit or credit, then get the opposite part of journals
//                 if(journalInfo.isCredit){      
//                     finalData[subcategoryIndex].totalCredit += journalInfo.amount
//                     finalData[subcategoryIndex].closingBalance += journalInfo.amount
//                     trialBalanceTotalCredit += journalInfo.amount
//                     trialBalanceTotalClosingBalance += journalInfo.amount
//                 }else{
//                     finalData[subcategoryIndex].totalDebit += journalInfo.amount
//                     finalData[subcategoryIndex].closingBalance -= journalInfo.amount
//                     trialBalanceTotalDebit += journalInfo.amount
//                     trialBalanceTotalClosingBalance -= journalInfo.amount
//                 }
//             }else if(groupInfo.name == 'assets'){
//                     // check if current journal is debit or credit, then get the opposite part journals
//                 if(journalInfo.isCredit){         
//                     finalData[subcategoryIndex].totalCredit += journalInfo.amount
//                     finalData[subcategoryIndex].closingBalance -= journalInfo.amount
//                     trialBalanceTotalCredit += journalInfo.amount
//                     trialBalanceTotalClosingBalance -= journalInfo.amount
//                 }else{             
//                     finalData[subcategoryIndex].totalDebit += journalInfo.amount
//                     finalData[subcategoryIndex].closingBalance += journalInfo.amount
//                     trialBalanceTotalDebit += journalInfo.amount
//                     trialBalanceTotalClosingBalance += journalInfo.amount
//                 }
//             }else if(groupInfo.name == 'incomes'){
//                 // for incomes
//                 // check if current journal is debit or credit, then get the opposite part journals
//                 if(journalInfo.isCredit){
//                     finalData[subcategoryIndex].totalCredit += journalInfo.amount
//                     finalData[subcategoryIndex].closingBalance += journalInfo.amount
//                     trialBalanceTotalCredit += journalInfo.amount
//                     trialBalanceTotalClosingBalance += journalInfo.amount
//                 }else{
//                     finalData[subcategoryIndex].totalDebit += journalInfo.amount
//                     finalData[subcategoryIndex].closingBalance -= journalInfo.amount
//                     trialBalanceTotalDebit += journalInfo.amount
//                     trialBalanceTotalClosingBalance -= journalInfo.amount
//                 }
//             }else{
//                 // for expenses
//                 // check if current journal is debit or credit, then get the opposite part journals
//                 if(journalInfo.isCredit){
//                     finalData[subcategoryIndex].totalCredit += journalInfo.amount
//                     finalData[subcategoryIndex].closingBalance -= journalInfo.amount
//                     trialBalanceTotalCredit += journalInfo.amount
//                     trialBalanceTotalClosingBalance -= journalInfo.amount
//                 }else{
//                     finalData[subcategoryIndex].totalDebit += journalInfo.amount
//                     finalData[subcategoryIndex].closingBalance += journalInfo.amount
//                     trialBalanceTotalDebit += journalInfo.amount
//                     trialBalanceTotalClosingBalance += journalInfo.amount
//                 }
//             }
//         }else{ 
//             // for supplier
//             let supplierIndex = finalData.findIndex((supplierData) => supplierData.particular == journalInfo.supplier.name)
//             if(supplierIndex != -1){
//                 if(journalInfo.isCredit){
//                     finalData[supplierIndex].totalCredit += journalInfo.amount
//                     finalData[supplierIndex].closingBalance += journalInfo.amount
//                     trialBalanceTotalCredit += journalInfo.amount
//                     trialBalanceTotalClosingBalance += journalInfo.amount
//                 }else{
//                     finalData[supplierIndex].totalDebit += journalInfo.amount
//                     finalData[supplierIndex].closingBalance -= journalInfo.amount
//                     trialBalanceTotalDebit += journalInfo.amount
//                     trialBalanceTotalClosingBalance -= journalInfo.amount
//                 }
//             }else{
//                 let branchWiseOpeningBalanceIndex = journalInfo.supplier.branchWiseOpeningBalance.findIndex((supplierOpeningBalance) => supplierOpeningBalance.branch  == condition.cost_center)
//                 if(journalInfo.isCredit){
//                     finalData.push({
//                         particular : journalInfo.supplier.name,
//                         totalDebit : 0,
//                         totalCredit : journalInfo.amount,
//                         closingBalance : (journalInfo.supplier.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
//                          journalInfo.supplier.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount + journalInfo.amount : journalInfo.amount
//                     })
//                     trialBalanceTotalCredit += journalInfo.amount
//                     trialBalanceTotalClosingBalance += (journalInfo.supplier.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
//                     journalInfo.supplier.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount + journalInfo.amount : journalInfo.amount
//                 }else{
//                     finalData.push({
//                         particular : journalInfo.supplier.name,
//                         totalDebit : journalInfo.amount,
//                         totalCredit : 0,
//                         closingBalance : (journalInfo.supplier.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ? 
//                         journalInfo.supplier.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount - journalInfo.amount : (-journalInfo.amount)
//                     })
//                     trialBalanceTotalDebit += journalInfo.amount
//                     trialBalanceTotalClosingBalance -= (journalInfo.supplier.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ? 
//                     journalInfo.supplier.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount - journalInfo.amount : (journalInfo.amount)
//                 }
//             }
//         }
//     })
//     await Promise.all(journalsForTrialBalanceArray)
//     finalData.map((data) => {
//         data.totalDebit = data.totalDebit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
//         data.totalCredit = data.totalCredit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
//         data.closingBalance = data.closingBalance.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
//     })
//     if(groupInfo.name == 'incomes' || groupInfo.name == 'expenses'){
//         allDataItems.push({
//             group: groupInfo.name,
//             subgroup : subgroupInfo.name,
//             category : categoryInfo.name,
//             trialBalance : finalData,
//             isIncomeExpense : true
//         })
//     }else{
//         allDataItems.push({
//             group: groupInfo.name,
//             subgroup : subgroupInfo.name,
//             category : categoryInfo.name,
//             trialBalance : finalData,
//             isIncomeExpense : false
//         })
//     }

//     if (type == 'excel') {
//         let mainData = []
//         let group;
//         let subgroup;
//         let category;

//         allDataItems.map((info) => {
//             group = info.group
//             subgroup = info.subgroup
//             category = info.category

//             info.trialBalance.map((trialBalanceInfo) => {
//                 let dataObj = {}
//                 dataObj.particular = trialBalanceInfo.particular
//                 dataObj.debit = Number(trialBalanceInfo.totalDebit)
//                 dataObj.credit = Number(trialBalanceInfo.totalCredit)
//                 dataObj.balance = Number(trialBalanceInfo.closingBalance)

//                 mainData.push(dataObj)
//             })
//         })
//         process.send({
//             mainData,
//             trialBalanceTotalDebit,
//             trialBalanceTotalCredit,
//             trialBalanceTotalClosingBalance,
//             group,
//             subgroup,
//             category
//         });
//     } else {
//         process.send({
//             allDataItems,
//             trialBalanceTotalDebit,
//             trialBalanceTotalCredit,
//             trialBalanceTotalClosingBalance
//         });
//     }
// });




////////
////////
var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
const GeneralJournal = require('../../../../../../models/Accounts/GeneralJournalDetails')
const Group = require('../../../../../../models/Accounts/Chart/Group')
const Subgroup = require('../../../../../../models/Accounts/Chart/SubGroup')
const Category = require('../../../../../../models/Accounts/Chart/Category')
const Supplier = require('../../../../../../models/Supplier')
const SubCategory = require('../../../../../../models/Accounts/Chart/SubCategory')

process.on('message', async (msg) => {
    let { prev, condition, type, from } = msg
    from = new Date(from)
    let allDataItems = []
    let finalData = []
    let trialBalanceTotalCredit = 0
    let trialBalanceTotalDebit = 0
    let trialBalanceTotalClosingBalance = 0
    let supplierPrevAmount = []
    
    let journalsForTrialBalance = await GeneralJournal.find(condition).sort({ record_date: 'asc' })
    .populate('group', 'name').populate('subgroup', 'name').populate('category', 'name').populate('subcategory', 'name')
    .populate('supplier', 'name branchWiseOpeningBalance')

    let subcategories = await SubCategory.find({category : condition.category})

    let groupInfo = await Group.findOne({
        _id: condition.group
    }).select('name')
    let subgroupInfo = await Subgroup.findOne({
        _id: condition.subgroup
    }).select('name')
    let categoryInfo = await Category.findOne({
        _id: condition.category
    }).select('name')
    let suppliers = await Supplier.find({
        branch: condition.cost_center
    }).select('name branchWiseOpeningBalance')

    let subcategoriesArray = subcategories.map( async (subcategoryInfo) => {
        let branchWiseOpeningBalanceIndex = subcategoryInfo.branchWiseOpening.findIndex((subcategoryOpeningBalance) => subcategoryOpeningBalance.branch  == condition.cost_center) 
        let closingBalance = 0
        let totalDebit = 0
        let totalCredit = 0
        if(groupInfo.name == 'owners equity' || groupInfo.name == 'liabilities' || groupInfo.name == 'assets'){
            condition.record_date = {
                '$lte': prev
            }
            condition.subcategory = subcategoryInfo._id 

            let journalsForClosingBalance = await GeneralJournal.find(condition).select('isCredit amount')
            
            if(journalsForClosingBalance.length > 0){
                let journalsForClosingBalanceArray = journalsForClosingBalance.map((journalInfo) => {
                    if(journalInfo.isCredit){
                        totalCredit += journalInfo.amount
                    }else{
                        totalDebit += journalInfo.amount
                    }
                })
                await Promise.all(journalsForClosingBalanceArray)
            
                if(groupInfo.name == 'assets'){
                    closingBalance += ( totalDebit - totalCredit) // closing balance for group asset
                }else if (groupInfo.name == 'liabilities'){
                    closingBalance += ( totalCredit - totalDebit) // closing balance for group liabilities
                }else{
                    closingBalance += ( totalCredit - totalDebit) // closing balance for group owners equity
                }
            }
    
        }

        finalData.push({
            particular : subcategoryInfo.name,
            totalDebit : 0,
            totalCredit : 0,
            closingBalance : (subcategoryInfo.branchWiseOpening.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
            (subcategoryInfo.branchWiseOpening[branchWiseOpeningBalanceIndex].opening_balance + closingBalance) : closingBalance
        })
        trialBalanceTotalClosingBalance += (subcategoryInfo.branchWiseOpening.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
        (subcategoryInfo.branchWiseOpening[branchWiseOpeningBalanceIndex].opening_balance + closingBalance) : closingBalance
    })
    await Promise.all(subcategoriesArray)
    

    //for supplier opening balance
    let suppliersArray = suppliers.map( async (supplierInfo) => {
        let branchWiseOpeningBalanceIndex = supplierInfo.branchWiseOpeningBalance.findIndex((supplierOpeningBalance) => supplierOpeningBalance.branch  == condition.cost_center)    
        let supplierAmount = 0
        let journalsForSupplier = await GeneralJournal.find({
            record_date: {
                '$lte': prev
            },
            supplier : supplierInfo._id,
            category : condition.category,
            cost_center : condition.cost_center
        }).populate('category', 'name')

        if(journalsForSupplier.length > 0){
            journalsForSupplier.map((supplierJournalInfo) => {
                if(supplierJournalInfo.isCredit){
                    supplierAmount += supplierJournalInfo.amount
                }else{
                    supplierAmount -= supplierJournalInfo.amount
                } 
            })
     
            finalData.push({
                particular : supplierInfo.name,
                totalDebit : 0,
                totalCredit : 0,
                closingBalance : (supplierInfo.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
                (supplierInfo.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount + supplierAmount) : supplierAmount
            })
            trialBalanceTotalClosingBalance += (supplierInfo.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
            (supplierInfo.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount + supplierAmount) : supplierAmount
        }
    })
    await Promise.all(suppliersArray)


    let journalsForTrialBalanceArray = journalsForTrialBalance.map((journalInfo) => {
        if(journalInfo.subcategory != null){
            let subcategoryIndex = finalData.findIndex((subcategoryData) => subcategoryData.particular == journalInfo.subcategory.name)
            if(groupInfo.name == 'owners equity' || groupInfo.name == 'liabilities'){
                    // check if current journal is debit or credit, then get the opposite part of journals
                if(journalInfo.isCredit){      
                    finalData[subcategoryIndex].totalCredit += journalInfo.amount
                    finalData[subcategoryIndex].closingBalance += journalInfo.amount
                    trialBalanceTotalCredit += journalInfo.amount
                    trialBalanceTotalClosingBalance += journalInfo.amount
                }else{
                    finalData[subcategoryIndex].totalDebit += journalInfo.amount
                    finalData[subcategoryIndex].closingBalance -= journalInfo.amount
                    trialBalanceTotalDebit += journalInfo.amount
                    trialBalanceTotalClosingBalance -= journalInfo.amount
                }
            }else if(groupInfo.name == 'assets'){
                    // check if current journal is debit or credit, then get the opposite part journals
                if(journalInfo.isCredit){         
                    finalData[subcategoryIndex].totalCredit += journalInfo.amount
                    finalData[subcategoryIndex].closingBalance -= journalInfo.amount
                    trialBalanceTotalCredit += journalInfo.amount
                    trialBalanceTotalClosingBalance -= journalInfo.amount
                }else{             
                    finalData[subcategoryIndex].totalDebit += journalInfo.amount
                    finalData[subcategoryIndex].closingBalance += journalInfo.amount
                    trialBalanceTotalDebit += journalInfo.amount
                    trialBalanceTotalClosingBalance += journalInfo.amount
                }
            }else if(groupInfo.name == 'incomes'){
                // for incomes
                // check if current journal is debit or credit, then get the opposite part journals
                if(journalInfo.isCredit){
                    finalData[subcategoryIndex].totalCredit += journalInfo.amount
                    finalData[subcategoryIndex].closingBalance += journalInfo.amount
                    trialBalanceTotalCredit += journalInfo.amount
                    trialBalanceTotalClosingBalance += journalInfo.amount
                }else{
                    finalData[subcategoryIndex].totalDebit += journalInfo.amount
                    finalData[subcategoryIndex].closingBalance -= journalInfo.amount
                    trialBalanceTotalDebit += journalInfo.amount
                    trialBalanceTotalClosingBalance -= journalInfo.amount
                }
            }else{
                // for expenses
                // check if current journal is debit or credit, then get the opposite part journals
                if(journalInfo.isCredit){
                    finalData[subcategoryIndex].totalCredit += journalInfo.amount
                    finalData[subcategoryIndex].closingBalance -= journalInfo.amount
                    trialBalanceTotalCredit += journalInfo.amount
                    trialBalanceTotalClosingBalance -= journalInfo.amount
                }else{
                    finalData[subcategoryIndex].totalDebit += journalInfo.amount
                    finalData[subcategoryIndex].closingBalance += journalInfo.amount
                    trialBalanceTotalDebit += journalInfo.amount
                    trialBalanceTotalClosingBalance += journalInfo.amount
                }
            }
        }else{ 
            // for supplier
            let supplierIndex = finalData.findIndex((supplierData) => supplierData.particular == journalInfo.supplier.name)
            if(supplierIndex != -1){
                if(journalInfo.isCredit){
                    finalData[supplierIndex].totalCredit += journalInfo.amount
                    finalData[supplierIndex].closingBalance += journalInfo.amount
                    trialBalanceTotalCredit += journalInfo.amount
                    trialBalanceTotalClosingBalance += journalInfo.amount
                }else{
                    finalData[supplierIndex].totalDebit += journalInfo.amount
                    finalData[supplierIndex].closingBalance -= journalInfo.amount
                    trialBalanceTotalDebit += journalInfo.amount
                    trialBalanceTotalClosingBalance -= journalInfo.amount
                }
            }else{
                let branchWiseOpeningBalanceIndex = journalInfo.supplier.branchWiseOpeningBalance.findIndex((supplierOpeningBalance) => supplierOpeningBalance.branch  == condition.cost_center)
                if(journalInfo.isCredit){
                    finalData.push({
                        particular : journalInfo.supplier.name,
                        totalDebit : 0,
                        totalCredit : journalInfo.amount,
                        closingBalance : (journalInfo.supplier.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
                         (journalInfo.supplier.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount + journalInfo.amount  ) : (journalInfo.amount)
                    })
                    trialBalanceTotalCredit += journalInfo.amount
                    trialBalanceTotalClosingBalance += (journalInfo.supplier.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
                    (journalInfo.supplier.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount + journalInfo.amount) : (journalInfo.amount)
                }else{
                    finalData.push({
                        particular : journalInfo.supplier.name,
                        totalDebit : journalInfo.amount,
                        totalCredit : 0,
                        closingBalance : (journalInfo.supplier.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ? 
                        (journalInfo.supplier.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount) - journalInfo.amount : ( - journalInfo.amount)
                    })
                    trialBalanceTotalDebit += journalInfo.amount
                    trialBalanceTotalClosingBalance -= (journalInfo.supplier.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ? 
                    (journalInfo.supplier.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount ) - journalInfo.amount : (journalInfo.amount)
                }
            }
        }
    })
    await Promise.all(journalsForTrialBalanceArray)
    
    finalData.map((data) => {
        data.totalDebit = data.totalDebit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
        data.totalCredit = data.totalCredit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
        data.closingBalance = data.closingBalance.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
    })
    if(groupInfo.name == 'incomes' || groupInfo.name == 'expenses'){
        allDataItems.push({
            group: groupInfo.name,
            subgroup : subgroupInfo.name,
            category : categoryInfo.name,
            trialBalance : finalData,
            isIncomeExpense : true
        })
    }else{
        allDataItems.push({
            group: groupInfo.name,
            subgroup : subgroupInfo.name,
            category : categoryInfo.name,
            trialBalance : finalData,
            isIncomeExpense : false
        })
    }

    if (type == 'excel') {
        let mainData = []
        let group;
        let subgroup;
        let category;

        allDataItems.map((info) => {
            group = info.group
            subgroup = info.subgroup
            category = info.category

            info.trialBalance.map((trialBalanceInfo) => {
                let dataObj = {}
                dataObj.particular = trialBalanceInfo.particular
                dataObj.debit = trialBalanceInfo.totalDebit
                dataObj.credit = trialBalanceInfo.totalCredit
                dataObj.balance = trialBalanceInfo.closingBalance

                mainData.push(dataObj)
            })
        })
        process.send({
            mainData,
            trialBalanceTotalDebit,
            trialBalanceTotalCredit,
            trialBalanceTotalClosingBalance,
            group,
            subgroup,
            category
        });
    } else {
        process.send({
            allDataItems,
            trialBalanceTotalDebit,
            trialBalanceTotalCredit,
            trialBalanceTotalClosingBalance
        });
    }
});