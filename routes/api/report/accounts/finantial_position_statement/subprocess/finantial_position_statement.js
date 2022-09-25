var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate")
const GeneralJournal = require('../../../../../../models/Accounts/GeneralJournalDetails');
const Group = require('../../../../../../models/Accounts/Chart/Group')
const Subgroup = require('../../../../../../models/Accounts/Chart/SubGroup')
const Category = require('../../../../../../models/Accounts/Chart/Category')
const Product = require('../../../../../../models/Product')
const Supplier = require('../../../../../../models/Supplier')
const SubCategory = require('../../../../../../models/Accounts/Chart/SubCategory')
const ProductDisposal = require('../../../../../../models/Tracking/Transaction/ProductDisposal')
const CategoryWiseDailyStock = require('../../../../../../models/CategoryWiseDailyStock')


process.on('message', async (msg) => {
    let { prev, condition, type, from, to} = msg
    from = new Date(from)
    to = new Date(to)
    let closingStockDate = new Date(to)
    closingStockDate.setDate(closingStockDate.getDate() + 1)
    
    let groupWiseCategory = []
    let profitFromIncomeCreate = null
    let profitFromIncomeBalance = 0
    let incomesId = null
    let expensesId = null
    let netIncomes = 0
    let retainedEarnings = 0
    let assets = []
    let equities = []
    let liabilities = []
    let totalAssets = 0
    let totalEquities = 0
    let totalLiabilities = 0
    let totalEquityLiabilities = 0
    let purchase = 0
    let other_direct_expense = 0
    let indirect_expense = 0
    let cost_of_good_sold = 0

    

    let journalsForTrialBalance = await GeneralJournal.find(condition).sort({ record_date: 'asc' })
    .populate('group', 'name').populate('category', 'name').populate('subcategory', 'name')
    .populate('supplier', 'name branchWiseOpeningBalance')

    let suppliers = await Supplier.find({
        branch: condition.cost_center
    }).select('name branchWiseOpeningBalance')
    
    let categories = await Category.find().populate('group', 'name').populate('subgroup', 'name').select('name')

    let categoryArray = categories.map( async (categoryInfo, index) => {
        let categoryClosingBalance = 0
        if(categoryInfo.group.name == 'owners equity' || categoryInfo.group.name == 'liabilities' || categoryInfo.group.name == 'assets'){
            let subcategories = []
            subcategories = await SubCategory.find({category : categoryInfo._id}).select('name create branchWiseOpening')
            let subcategoriesArray = subcategories.map( async (subcategoryInfo) => {
                let branchWiseOpeningBalanceIndex = subcategoryInfo.branchWiseOpening.findIndex((subcategoryOpeningBalance) => subcategoryOpeningBalance.branch  == condition.cost_center)
                let closingBalance = 0
                let totalDebit = 0
                let totalCredit = 0
                 
                
                let journalsForClosingBalance = await GeneralJournal.find({
                    record_date: {
                        '$lte': prev
                    },
                    subcategory : subcategoryInfo._id,
                    category : categoryInfo._id,
                    cost_center : condition.cost_center
                }).select('isCredit amount')
                
                
                if(journalsForClosingBalance.length > 0){
                    let journalsForClosingBalanceArray = journalsForClosingBalance.map((journalInfo) => {
                        if(journalInfo.isCredit){
                            totalCredit += journalInfo.amount
                        }else{
                            totalDebit += journalInfo.amount
                        }
                    })
                    await Promise.all(journalsForClosingBalanceArray)
                
                    if(categoryInfo.group.name == 'assets'){
                        closingBalance += ( totalDebit - totalCredit) // closing balance for group asset
                    }else if (categoryInfo.group.name == 'liabilities'){
                        closingBalance += ( totalCredit - totalDebit) // closing balance for group liabilities
                    }else{
                        closingBalance += ( totalCredit - totalDebit) // closing balance for group owners equity
                    }
                }
                if(categoryInfo.name != 'retained earnings'){
                    categoryClosingBalance += (subcategoryInfo.branchWiseOpening.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
                    (subcategoryInfo.branchWiseOpening[branchWiseOpeningBalanceIndex].opening_balance + closingBalance) : closingBalance
                }
                if(subcategoryInfo.name == 'profit from income'){
                    profitFromIncomeCreate = subcategoryInfo.create
                    profitFromIncomeBalance = (subcategoryInfo.branchWiseOpening.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
                    (subcategoryInfo.branchWiseOpening[branchWiseOpeningBalanceIndex].opening_balance) : 0
                }
            })
            
            await Promise.all(subcategoriesArray)
        
            let suppliersArray = suppliers.map( async (supplierInfo) => {
                let branchWiseOpeningBalanceIndex = supplierInfo.branchWiseOpeningBalance.findIndex((supplierOpeningBalance) => supplierOpeningBalance.branch  == condition.cost_center)    
                let supplierAmount = 0
                let journalsForSupplier = await GeneralJournal.find({
                    record_date: {
                        '$lte': prev
                    },
                    supplier : supplierInfo._id,
                    category : categoryInfo._id,
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
            
                    categoryClosingBalance += (supplierInfo.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
                    (supplierInfo.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount + supplierAmount) : supplierAmount
                }
            })
            await Promise.all(suppliersArray)


            if(categoryInfo.name != 'retained earnings'){
                groupWiseCategory.push({
                    serial : index + 1,
                    group : categoryInfo.group.name,
                    subgroup : categoryInfo.subgroup.name,
                    category : categoryInfo.name,
                    supplier : [],
                    isDebit : (categoryInfo.group.name == "assets" || categoryInfo.group.name == "expenses") ? true : false,
                    isCredit : (categoryInfo.group.name == "assets" || categoryInfo.group.name == "expenses") ? false : true,
                    closingBalance : categoryClosingBalance
                })
            }
        }
        if(categoryInfo.group.name == 'incomes'){
            incomesId = categoryInfo.group._id
        }
        if(categoryInfo.group.name == 'expenses'){
            expensesId = categoryInfo.group._id
        }
    })
    await Promise.all(categoryArray)

    // For Retained Earnings
    profitFromIncomeCreate.setHours(0)
    profitFromIncomeCreate.setMinutes (0)
    profitFromIncomeCreate.setSeconds (0)
    to.setHours(23)
    to.setMinutes (59)
    to.setSeconds (59)

    let incomeCondition = {
        record_date : {
            $gte: isodate(profitFromIncomeCreate),
            $lte: isodate(to)
        },
        group: incomesId,
        cost_center : condition.cost_center
    }
    let expenseCondition = {
        record_date : {
            $gte: isodate(profitFromIncomeCreate),
            $lte: isodate(to)
        },
        group: expensesId,
        cost_center : condition.cost_center
    }

    let incomesJournals = await GeneralJournal.find(incomeCondition)
    let expensesJournals = await GeneralJournal.find(expenseCondition).populate('group', 'name').populate('category', 'name').populate('subcategory', 'name').populate('subgroup', 'name')

    incomesJournals.map((incomeInfo) => {
        if(incomeInfo.isCredit){
            netIncomes += incomeInfo.amount
        }else{
            netIncomes -= incomeInfo.amount
        }
    })
    expensesJournals.map((expenseInfo) => {
        if(expenseInfo.subgroup.name = "direct"){
            if(expenseInfo.category.name == 'expenses'){
                purchase += expenseInfo.amount
            }else{
                other_direct_expense += expenseInfo.amount
            }
        }else{
            indirect_expense += expenseInfo.amount
        }
    })
    
    // For category wise trial balance calculation
    let journalsForTrialBalanceArray = journalsForTrialBalance.map((journalInfo) => {
        let categoryIndex = groupWiseCategory.findIndex((categoryData) => categoryData.category == journalInfo.category.name)
        if(categoryIndex != -1){
            if(journalInfo.subcategory != null){
                if(journalInfo.group.name == 'owners equity' || journalInfo.group.name == 'liabilities'){
                        // check if current journal is debit or credit, then get the opposite part of journals
                    if(journalInfo.isCredit){      
                        groupWiseCategory[categoryIndex].closingBalance += journalInfo.amount
                        
                    }else{
                        groupWiseCategory[categoryIndex].closingBalance -= journalInfo.amount
                        
                    }
                } 
                if(journalInfo.group.name == 'assets'){
                        // check if current journal is debit or credit, then get the opposite part journals
                    if(journalInfo.isCredit){         
                        groupWiseCategory[categoryIndex].closingBalance -= journalInfo.amount
                        
                    }else{             
                        groupWiseCategory[categoryIndex].closingBalance += journalInfo.amount
                        
                    }
                }
            }else{ 
                // for supplier
                let supplierIndex = groupWiseCategory[categoryIndex].supplier.findIndex((supplierData) => supplierData == journalInfo.supplier.name)
                if(supplierIndex != -1){
                    if(journalInfo.isCredit){
                        groupWiseCategory[categoryIndex].closingBalance += journalInfo.amount
                        
                    }else{
                        groupWiseCategory[categoryIndex].closingBalance -= journalInfo.amount
                        
                    }
                }else{
                    
                    let branchWiseOpeningBalanceIndex = journalInfo.supplier.branchWiseOpeningBalance.findIndex((supplierOpeningBalance) => supplierOpeningBalance.branch  == condition.cost_center)
                    if(journalInfo.isCredit){
                        groupWiseCategory[categoryIndex].supplier.push(journalInfo.supplier.name)
                        groupWiseCategory[categoryIndex].closingBalance += (journalInfo.supplier.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ?
                        journalInfo.supplier.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount + journalInfo.amount : journalInfo.amount
                        
                    }else{
                        groupWiseCategory[categoryIndex].supplier.push(journalInfo.supplier.name)
                        groupWiseCategory[categoryIndex].closingBalance += (journalInfo.supplier.branchWiseOpeningBalance.length > 0 && branchWiseOpeningBalanceIndex != -1 ) ? 
                        journalInfo.supplier.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount - journalInfo.amount : (-journalInfo.amount)
                        
                    }
                }
            }
        }
    })

    await Promise.all(journalsForTrialBalanceArray)
    
    let closingStockDateFrom = new Date(closingStockDate)
    closingStockDateFrom.setHours(0)
    closingStockDateFrom.setMinutes(0)
    closingStockDateFrom.setSeconds(0)

    let closingStockDateTo = new Date(closingStockDate)
    closingStockDateTo.setHours(23)
    closingStockDateTo.setMinutes(59)
    closingStockDateTo.setSeconds(59)

    let categoryWiseDailyStocks = await CategoryWiseDailyStock.findOne({
        branch: condition.cost_center,
        create: {
            $gte: isodate(closingStockDateFrom),
            $lte: isodate(closingStockDateTo)
        }
    })

    cost_of_good_sold = (profitFromIncomeBalance + purchase + other_direct_expense) - categoryWiseDailyStocks.totalCostAmount
    retainedEarnings = ((profitFromIncomeBalance + netIncomes) - cost_of_good_sold - indirect_expense)
    
    groupWiseCategory.push({
        serial : categories.length + 1,
        group: 'owners equity',
        subgroup: 'equity',
        category : 'Retained earning',
        isDebit : false,
        isCredit : true,
        closingBalance : retainedEarnings
    })
    groupWiseCategory.push({
        serial : categories.length + 2,
        group: 'assets',
        subgroup: 'current assets',
        category : 'Closing Stock',
        isDebit : true,
        isCredit : false,
        closingBalance : categoryWiseDailyStocks ? categoryWiseDailyStocks.totalCostAmount : 0
    })
    groupWiseCategory.map((finalDataInfo) => {
        if(finalDataInfo.group == 'assets'){
            let assetsIndex = assets.findIndex((assetInfo) => assetInfo.subgroup == finalDataInfo.subgroup)
            if(assetsIndex == -1){
                assets.push({
                    subgroup : finalDataInfo.subgroup,
                    category : [
                        {
                            name : finalDataInfo.category,
                            amount: finalDataInfo.closingBalance.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                        }
                    ],
                    total : Number(finalDataInfo.closingBalance.toFixed(2))
                })
            }else{
                assets[assetsIndex].category.push({
                    name : finalDataInfo.category,
                    amount: finalDataInfo.closingBalance.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                })
                assets[assetsIndex].total += Number(finalDataInfo.closingBalance.toFixed(2))
            }
            totalAssets += finalDataInfo.closingBalance
        }else if(finalDataInfo.group == 'owners equity'){
            let equityIndex = equities.findIndex((equityInfo) => equityInfo.subgroup == finalDataInfo.subgroup)
            if(equityIndex == -1){
                equities.push({
                    subgroup : finalDataInfo.subgroup,
                    category : [
                        {
                            name : finalDataInfo.category,
                            amount: finalDataInfo.closingBalance.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                        }
                    ],
                    total : Number(finalDataInfo.closingBalance.toFixed(2))
                })
                if(finalDataInfo.category == 'Retained earning'){
                    equities.total = (finalDataInfo.closingBalance)
                }
            }else{
                equities[equityIndex].category.push({
                    name : finalDataInfo.category,
                    amount: finalDataInfo.closingBalance.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                })

                equities[equityIndex].total += Number(finalDataInfo.closingBalance.toFixed(2))
            }

            totalEquities += finalDataInfo.closingBalance
            
        }else{
            let liabilityIndex = liabilities.findIndex((liabilityInfo) => liabilityInfo.subgroup == finalDataInfo.subgroup)
            if(liabilityIndex == -1){
                liabilities.push({
                    subgroup : finalDataInfo.subgroup,
                    category : [
                        {
                            name : finalDataInfo.category,
                            amount: finalDataInfo.closingBalance.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                        }
                    ],
                    total : Number(finalDataInfo.closingBalance.toFixed(2))
                })
            }else{
                liabilities[liabilityIndex].category.push({
                    name : finalDataInfo.category,
                    amount: finalDataInfo.closingBalance.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                })
                liabilities[liabilityIndex].total += Number(finalDataInfo.closingBalance.toFixed(2))
            }
            totalLiabilities += finalDataInfo.closingBalance
        }  
    })

    totalEquityLiabilities = totalLiabilities + totalEquities

    if (type == 'excel') {
        let mainData = []
        assets.map((info, index) => {
            let dataObj = {}
            if(index == 0){
                mainData.push({
                    category : 'Assets:',
                    amount : ''
                })
                mainData.push({
                    category : '',
                    amount : ''
                })
            }
            mainData.push({
                category : info.subgroup,
                amount : ''
            })
            mainData.push({
                category : '',
                amount : ''
            })
            info.category.map((categoryInfo) => {
                dataObj = {}
                dataObj.category = categoryInfo.name
                dataObj.amount = categoryInfo.amount
                mainData.push(dataObj)
            })
            mainData.push({
                category : '',
                amount : ''
            })
            mainData.push({
                category : 'Total',
                amount : info.total
            })
            mainData.push({
                category : '',
                amount : ''
            })    
        })

        mainData.push({
            category : 'Total Assets',
            amount : totalAssets
        })
        equities.map((info) => {
            let dataObj = {}
            mainData.push({
                category : '',
                amount : ''
            })
            mainData.push({
                category : 'Equity & Liability:',
                amount : ''
            })
            mainData.push({
                category : '',
                amount : ''
            })
            mainData.push({
                category : info.subgroup,
                amount : ''
            })
            mainData.push({
                category : '',
                amount : ''
            })
            info.category.map((categoryInfo) => {
                dataObj = {}
                dataObj.category = categoryInfo.name
                dataObj.amount = categoryInfo.amount
                mainData.push(dataObj)
            })
            mainData.push({
                category : '',
                amount : ''
            })  
            mainData.push({
                category : 'Total',
                amount : info.total
            })
            mainData.push({
                category : '',
                amount : ''
            })
        })

        liabilities.map((info) => {
            let dataObj = {}
            mainData.push({
                category : info.subgroup,
                amount : ''
            })
            mainData.push({
                category : '',
                amount : ''
            })
            info.category.map((categoryInfo) => {
                dataObj = {}
                dataObj.category = categoryInfo.name
                dataObj.amount = categoryInfo.amount
                mainData.push(dataObj)
            })
            mainData.push({
                category : '',
                amount : ''
            })
            mainData.push({
                category : 'Total',
                amount : info.total
            })
            mainData.push({
                category : '',
                amount : ''
            })
        })
        mainData.push({
            category : 'Total Equites & Liabilites',
            amount : totalEquityLiabilities
        })
        process.send({
            mainData
        });
    } else {
        process.send({
            assets,
            liabilities,
            equities,
            totalAssets,
            totalEquityLiabilities
        });
    }
});