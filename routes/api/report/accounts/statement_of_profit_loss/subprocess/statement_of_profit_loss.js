
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
        let { prev, condition, type, from, to } = msg
        from = new Date(from)
        to = new Date(to)
        let closingStockDate = new Date(to)
        closingStockDate.setDate(closingStockDate.getDate() + 1)
        let groupWiseCategory = []
        let trialBalanceTotalCredit = 0
        let trialBalanceTotalDebit = 0
        let incomes = []
        let expenses = []
        let totalDirectIncome = 0
        let totalIndirectIncome = 0
        let totalOtherDirectExpense = 0
        let purchase = 0
        let totalIndirectExpense = 0
        let costOfGoodsSold = 0
        let grossProfitLoss = 0
        let netProfitLoss = 0
    
        
    
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
            }
    
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
                    subgroup : categoryInfo.subgroup.name,
                    category : categoryInfo.name,
                    supplier : [],
                    isDebit : (categoryInfo.group.name == "assets" || categoryInfo.group.name == "expenses") ? true : false,
                    isCredit : (categoryInfo.group.name == "assets" || categoryInfo.group.name == "expenses") ? false : true,
                    closingBalance : categoryClosingBalance
                })
            }
        })
        await Promise.all(categoryArray)
    
        
        
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
     
        let prevDayFrom = new Date(prev)
        prevDayFrom.setHours(0)
        prevDayFrom.setMinutes(0);
        prevDayFrom.setSeconds(0);
    
        let prevDayTo = new Date(prev)
        prevDayTo.setHours(23)
        prevDayTo.setMinutes(59);
        prevDayTo.setSeconds(59);
    
        let openingStocks = await CategoryWiseDailyStock.findOne({
            branch: condition.cost_center,
            create: {
                $gte: isodate(prevDayFrom),
                $lte: isodate(prevDayTo)
            }
        })
        let openingInventory = openingStocks ? openingStocks.totalCostAmount : 0

    
        let closingStockDateFrom = new Date(closingStockDate)
        closingStockDateFrom.setHours(0)
        closingStockDateFrom.setMinutes(0)
        closingStockDateFrom.setSeconds(0)
    
        let closingStockDateTo = new Date(closingStockDate)
        closingStockDateTo.setHours(23)
        closingStockDateTo.setMinutes(59)
        closingStockDateTo.setSeconds(59)

        let closingStocks = await CategoryWiseDailyStock.findOne({
            branch: condition.cost_center,
            create: {
                $gte: isodate(closingStockDateFrom),
                $lte: isodate(closingStockDateTo)
            }
        })
        
        let closingInventory = closingStocks ? closingStocks.totalCostAmount : 0


        groupWiseCategory.map((finalDataInfo) => {
            if(finalDataInfo.group == 'incomes'){
                if(finalDataInfo.subgroup == 'direct income'){
                    totalDirectIncome += finalDataInfo.closingBalance
                }
                if(finalDataInfo.subgroup == 'indirect income'){
                    totalIndirectIncome += finalDataInfo.closingBalance
                }
                let incomeIndex = incomes.findIndex((incomeInfo) => incomeInfo.subgroup == finalDataInfo.subgroup)
                if(incomeIndex == -1){
                    incomes.push({
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
                    incomes[incomeIndex].category.push({
                        name : finalDataInfo.category,
                        amount: finalDataInfo.closingBalance.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                    })
                    incomes[incomeIndex].total += Number(finalDataInfo.closingBalance.toFixed(2))
                }
                
            }
            if(finalDataInfo.group == 'expenses'){
                if(finalDataInfo.subgroup == 'direct expense'){
                    if(finalDataInfo.category == 'purchase'){
                        purchase += finalDataInfo.closingBalance
                    }else{
                        totalOtherDirectExpense += finalDataInfo.closingBalance
                    }
                }
                if(finalDataInfo.subgroup == 'indirect expense'){
                    totalIndirectExpense += finalDataInfo.closingBalance
                }
                let expenseIndex = expenses.findIndex((expenseInfo) => expenseInfo.subgroup == finalDataInfo.subgroup)
                if(expenseIndex == -1){
                    expenses.push({
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
                    expenses[expenseIndex].category.push({
                        name : finalDataInfo.category,
                        amount: finalDataInfo.closingBalance.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                    })
                    expenses[expenseIndex].total += Number(finalDataInfo.closingBalance.toFixed(2))
                }
            }
        })

        costOfGoodsSold = ((openingInventory + purchase + totalOtherDirectExpense) - closingInventory)
        grossProfitLoss = (costOfGoodsSold < 0) ? (totalDirectIncome + costOfGoodsSold) : (totalDirectIncome - costOfGoodsSold)
        netProfitLoss = ((grossProfitLoss + totalIndirectIncome) - totalIndirectExpense)

        costOfGoodsSold = costOfGoodsSold.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        grossProfitLoss = grossProfitLoss.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        netProfitLoss =   netProfitLoss.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        openingInventory = openingInventory.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        purchase = purchase.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        totalOtherDirectExpense = totalOtherDirectExpense.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        closingInventory = closingInventory.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        totalIndirectIncome = totalIndirectIncome.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        totalIndirectExpense = totalIndirectExpense.toLocaleString('en-In', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        
        if (type == 'excel') {
            let mainData = []
            mainData.push({
                category : '',
                amount : ''
            })
            mainData.push({
                category : 'Opening Inventory',
                amount : openingInventory
            })
            mainData.push({
                category : 'Purchase',
                amount : purchase
            })
            mainData.push({
                category : 'Other Direct Expense',
                amount : totalOtherDirectExpense
            })
            mainData.push({
                category : 'Clsoing Inventory',
                amount : closingInventory
            })
            mainData.push({
                category : 'Cost of Good Sold',
                amount : costOfGoodsSold
            })
            mainData.push({
                category : '',
                amount : ''
            })
            incomes.map((info, index) => {
                let dataObj = {}
                if(index == 0){
                    mainData.push({
                        category : 'Incomes:',
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
            expenses.map((info) => {
                let dataObj = {}
                mainData.push({
                    category : '',
                    amount : ''
                })
                mainData.push({
                    category : 'Expenses',
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
            mainData.push({
                category : 'Gross Profit',
                amount : grossProfitLoss
            })
            mainData.push({
                category : '',
                amount : ''
            })
            mainData.push({
                category : 'Net Profit',
                amount : netProfitLoss
            })
            process.send({
                mainData
            });
        } else {
            process.send({
                expenses,
                incomes,
                costOfGoodsSold,
                grossProfitLoss,
                netProfitLoss,
                openingInventory,
                purchase,
                totalOtherDirectExpense,
                closingInventory
            });
        }
    });