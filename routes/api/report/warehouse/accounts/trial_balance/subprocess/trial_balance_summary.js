var mongoConnection = require('../../../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate")
const GeneralJournal = require('../../../../../../../models/Accounts/GeneralJournalDetails');
const Group = require('../../../../../../../models/Accounts/Chart/Group')
const Category = require('../../../../../../../models/Accounts/Chart/Category')
const Product = require('../../../../../../../models/Product')
const Supplier = require('../../../../../../../models/Supplier')
const SubCategory = require('../../../../../../../models/Accounts/Chart/SubCategory')
const ProductDisposal = require('../../../../../../../models/Tracking/WarehouseTransaction/ProductDisposal')
const CategoryWiseDailyStock = require('../../../../../../../models/CategoryWiseDailyStock')


process.on('message', async (msg) => {
    let { prev, condition, type, from } = msg
    from = new Date(from)
    let to = new Date()
    prev = new Date(prev)
    let groupWiseCategory = []
    let trialBalanceTotalCredit = 0
    let trialBalanceTotalDebit = 0
    let totalCostAmount = 0
    let totalDisposeAmont = 0
    let profitFromIncomeCreate = null
    let profitFromIncomeBalance = 0
    let incomesId = null
    let expensesId = null
    let netIncomes = 0
    let netExpenses = 0
    let retainedEarnings = 0
    let purchase = 0
    let other_direct_expense = 0
    let indirect_expense = 0
    let cost_of_good_sold = 0

    

    let journalsForTrialBalance = await GeneralJournal.find(condition).sort({ record_date: 'asc' })
    .populate('group', 'name').populate('category', 'name').populate('subcategory', 'name')
    .populate('supplier', 'name warehouseOpeningBalance')

    let suppliers = await Supplier.find({
        activeSupplier: true,
        warehouseSupplier : true
    }).select('name warehouseOpeningBalance')
    
    let disposeDataList = await ProductDisposal.find({
        create: condition.create
    })
    
    let categories = await Category.find().populate('group', 'name').select('name')

    let categoryArray = categories.map( async (categoryInfo, index) => {
        let categoryClosingBalance = 0
        if(categoryInfo.group.name == 'owners equity' || categoryInfo.group.name == 'liabilities' || categoryInfo.group.name == 'assets'){
            let subcategories = []
            subcategories = await SubCategory.find({category : categoryInfo._id}).select('name create warehouse_opening_balance')
            let subcategoriesArray = subcategories.map( async (subcategoryInfo) => {
                let closingBalance = 0
                let totalDebit = 0
                let totalCredit = 0
                 
                
                let journalsForClosingBalance = await GeneralJournal.find({
                    record_date: {
                        '$lte': prev
                    },
                    subcategory : subcategoryInfo._id,
                    category : categoryInfo._id,
                    cost_center : null
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
                    categoryClosingBalance += (subcategoryInfo.warehouse_opening_balance + closingBalance) 
                }
                if(subcategoryInfo.name == 'profit from income'){
                    profitFromIncomeCreate = subcategoryInfo.create
                    profitFromIncomeBalance = (subcategoryInfo.warehouse_opening_balance)
                }
            })
            
            await Promise.all(subcategoriesArray)
        }

        let suppliersArray = suppliers.map( async (supplierInfo) => { 
            
            let supplierAmount = 0
            let journalsForSupplier = await GeneralJournal.find({
                record_date: {
                    '$lte': prev
                },
                supplier : supplierInfo._id,
                category : categoryInfo._id,
                cost_center : null
            }).populate('category', 'name')
    
            if(journalsForSupplier.length > 0){
                journalsForSupplier.map((supplierJournalInfo) => {
                    if(supplierJournalInfo.isCredit){
                        supplierAmount += supplierJournalInfo.amount
                    }else{
                        supplierAmount -= supplierJournalInfo.amount
                    } 
                })
                
                categoryClosingBalance += (supplierInfo.warehouseOpeningBalance ? (supplierInfo.warehouseOpeningBalance + supplierAmount) : supplierAmount)
            }
        })
        await Promise.all(suppliersArray)


        if(categoryInfo.group.name == 'incomes'){
            incomesId = categoryInfo.group._id
        }
        if(categoryInfo.group.name == 'expenses'){
            expensesId = categoryInfo.group._id
        }
        if(categoryInfo.name != 'retained earnings'){
            groupWiseCategory.push({
                serial : index + 1,
                group : categoryInfo.group.name,
                category : categoryInfo.name,
                supplier : [],
                isDebit : (categoryInfo.group.name == "assets" || categoryInfo.group.name == "expenses") ? true : false,
                isCredit : (categoryInfo.group.name == "assets" || categoryInfo.group.name == "expenses") ? false : true,
                closingBalance : categoryClosingBalance ? categoryClosingBalance : 0
            })
        }
    })
    await Promise.all(categoryArray)

    // For Retained Earnings
    // For Retained Earnings
    profitFromIncomeCreate.setHours(0)
    profitFromIncomeCreate.setMinutes (0)
    profitFromIncomeCreate.setSeconds (0)
    prev.setHours(23)
    prev.setMinutes (59)
    prev.setSeconds (59)
    let incomeCondition = {
        record_date : {
            $gte: isodate(profitFromIncomeCreate),
            $lte: isodate(prev)
        },
        group: incomesId,
        cost_center : null
    }
    let expenseCondition = {
        record_date : {
            $gte: isodate(profitFromIncomeCreate),
            $lte: isodate(prev)
        },
        group: expensesId,
        cost_center : null
    }

    let incomesJournals = await GeneralJournal.find(incomeCondition)
    let expensesJournals = await GeneralJournal.find(expenseCondition)

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

    //For Dispose Amount
    disposeDataList.map(disposalInfo => {
        disposalInfo.products.map(disposalProduct => {
            totalDisposeAmont += (Number(disposalProduct.disposal) * disposalProduct.price.purchase)
        })
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
                }else if(journalInfo.group.name == 'assets'){
                        // check if current journal is debit or credit, then get the opposite part journals
                    if(journalInfo.isCredit){         
                        groupWiseCategory[categoryIndex].closingBalance -= journalInfo.amount
                        
                    }else{             
                        groupWiseCategory[categoryIndex].closingBalance += journalInfo.amount
                        
                    }
                }else if(journalInfo.group.name == 'incomes'){
                    // for incomes
                    // check if current journal is debit or credit, then get the opposite part journals
                    if(journalInfo.isCredit){
                        groupWiseCategory[categoryIndex].closingBalance += journalInfo.amount
                        
                    }else{
                        groupWiseCategory[categoryIndex].closingBalance -= journalInfo.amount
                        
                    }
                }else{
                    // for expenses
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
                    
                    if(journalInfo.isCredit){
                        groupWiseCategory[categoryIndex].supplier.push(journalInfo.supplier.name)
                        groupWiseCategory[categoryIndex].closingBalance += (journalInfo.supplier.warehouseOpeningBalance + journalInfo.amount )
                        
                    }else{
                        groupWiseCategory[categoryIndex].supplier.push(journalInfo.supplier.name)
                        groupWiseCategory[categoryIndex].closingBalance += (journalInfo.supplier.warehouseOpeningBalance - journalInfo.amount )
                        
                    }
                }
            }
        }
    })

    await Promise.all(journalsForTrialBalanceArray)
 
    let prevDayFrom = new Date(prev)
    prevDayFrom.setHours(0)
    prevDayFrom.setMinutes(0);
    prevDayFrom.setSeconds(0);

    let prevDayTo = new Date(prev)
    prevDayTo.setHours(23)
    prevDayTo.setMinutes(59);
    prevDayTo.setSeconds(59);

    let categoryWiseDailyStocks = await CategoryWiseDailyStock.findOne({
        branch: null,
        create: {
            $gte: isodate(prevDayFrom),
            $lte: isodate(prevDayTo)
        }
    })

    cost_of_good_sold = (profitFromIncomeBalance + purchase + other_direct_expense) - (categoryWiseDailyStocks ?  categoryWiseDailyStocks.totalCostAmount : 0)
    retainedEarnings = ((profitFromIncomeBalance + netIncomes) - cost_of_good_sold - indirect_expense)

    groupWiseCategory.push({
        serial : categories.length + 1,
        category : 'Retained earning',
        isDebit : false,
        isCredit : true,
        closingBalance : retainedEarnings
    })
    groupWiseCategory.push({
        serial : categories.length + 2,
        category : 'Opening inventory',
        isDebit : true,
        isCredit : false,
        closingBalance : categoryWiseDailyStocks ? categoryWiseDailyStocks.totalCostAmount : 0
    })
    
    groupWiseCategory.map((finalDataInfo) => {
        if(finalDataInfo.isDebit){
            trialBalanceTotalDebit += finalDataInfo.closingBalance
        }
        if(finalDataInfo.isCredit){
            trialBalanceTotalCredit += finalDataInfo.closingBalance
        }
        finalDataInfo.closingBalance =   finalDataInfo.closingBalance.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
    })

    
    if (type == 'excel') {
        let mainData = []
        groupWiseCategory.map((info) => {
            let dataObj = {}
            dataObj.serial = info.serial
            dataObj.category = info.category
            dataObj.debitBalance = info.isDebit ? info.closingBalance : 0
            dataObj.creditBalance = info.isCredit ? info.closingBalance : 0

            mainData.push(dataObj)
        })
        process.send({
            mainData,
            trialBalanceTotalDebit,
            trialBalanceTotalCredit,
            totalDisposeAmont
        });
    } else {
        process.send({
            groupWiseCategory,
            trialBalanceTotalDebit,
            trialBalanceTotalCredit,
            totalDisposeAmont
        });
    }
});