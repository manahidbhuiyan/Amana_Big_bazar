var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
const GeneralJournal = require('../../../../../../models/Accounts/GeneralJournalDetails');
const Journals = require('../../../../../../models/Accounts/GeneralJournal');
const Group = require('../../../../../../models/Accounts/Chart/Group')
const Subgroup = require('../../../../../../models/Accounts/Chart/SubGroup')
const Category = require('../../../../../../models/Accounts/Chart/Category')
const Supplier = require('../../../../../../models/Supplier')
const Voucher = require('../../../../../../models/Accounts/Settings/Voucher');
const SubCategory = require('../../../../../../models/Accounts/Chart/SubCategory');

process.on('message', async (msg) => {
    let { prev, condition, type, from } = msg
    from = new Date(from)
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let journalsForLedger;
    let journalsForClosingBalance;
    let totalCredit = 0
    let totalDebit = 0
    let closingBalance = 0
    let allDataItems = []
    let ledgerList = []
    let grandTotalDebit = 0
    let grandTotalCredit = 0
    let supplierInfo

   
    if(condition.supplier == undefined){
        journalsForLedger = await GeneralJournal.find(condition).sort({ record_date: 1 })
        .populate('group', 'name').populate('subgroup', 'name')
        .populate('category', 'name').populate('subcategory', 'name')
        .populate('voucher', 'name serialNo').populate('general_journal', 'serialNo')
    }else{
        journalsForLedger = await GeneralJournal.find(condition).sort({ record_date: 1 })
        .populate('group', 'name').populate('subgroup', 'name').populate('category', 'name')
        .populate('supplier', 'name').populate('voucher', 'name serialNo').populate('general_journal', 'serialNo')
    }
    
    //get group name
    let groupInfo = await Group.findOne({
        _id: condition.group
    }).select('name')

    let subcategoryInfo = await SubCategory.findOne({
        _id: condition.subcategory
    }).select('create name branchWiseOpening')

    if(condition.supplier != undefined){
        supplierInfo = await Supplier.findOne({
            _id: condition.supplier
        }).select('name branchWiseOpeningBalance')
    }

    if(condition.supplier == undefined){
        if(subcategoryInfo.branchWiseOpening.length > 0){
            let branchWiseOpeningBalanceIndex = subcategoryInfo.branchWiseOpening.findIndex((subcategoryOpeningBalance) => subcategoryOpeningBalance.branch  == condition.cost_center)
            closingBalance += (branchWiseOpeningBalanceIndex != -1 ? subcategoryInfo.branchWiseOpening[branchWiseOpeningBalanceIndex].opening_balance : 0)
        }
    }else{
        if(supplierInfo.branchWiseOpeningBalance.length > 0){
            let branchWiseOpeningBalanceIndex = supplierInfo.branchWiseOpeningBalance.findIndex((supplierOpeningBalance) => supplierOpeningBalance.branch  == condition.cost_center)
            closingBalance += (branchWiseOpeningBalanceIndex != -1 ? supplierInfo.branchWiseOpeningBalance[branchWiseOpeningBalanceIndex].amount : 0)
        } 
    }
    
    // checke if group name is incomes or expenses, if not calculate closing balance of previous day of from date
    if(groupInfo.name == 'owners equity' || groupInfo.name == 'liabilities' || groupInfo.name == 'assets'){
        condition.record_date = {
            '$lte': prev
        }
        journalsForClosingBalance = await GeneralJournal.find(condition).select('isCredit amount').populate('subcategory', 'name')
        if(journalsForClosingBalance.length > 0){
            journalsForClosingBalance.map((journalInfo) => {
                if(journalInfo.isCredit){
                    totalCredit += journalInfo.amount
                }else{
                    totalDebit += journalInfo.amount
                }
            })
        
            if(groupInfo.name == 'assets'){
                closingBalance += ( totalDebit - totalCredit) // closing balance for group asset
            }else if (groupInfo.name == 'liabilities'){
                closingBalance += ( totalCredit - totalDebit) // closing balance for group liabilities
            }else{
                closingBalance += ( totalCredit - totalDebit) // closing balance for group owners equity
            }
        }

    }

    if(journalsForLedger.length > 0){
        //initialize ledgerList for opening balance
        if(groupInfo.name == 'owners equity' || groupInfo.name == 'liabilities' || groupInfo.name == 'assets'){
            ledgerList = [{
                date: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear() ,
                particular: ["Opening Balance"],
                naration: "",
                voucherNo: null,
                voucherType: "",
                chequeNo: "",
                debit: null,
                credit: null,
                balance: closingBalance.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
            }];
        }
        let openingBalance = closingBalance
        
        // create Ledgers
        let journalsForLedgerArray  = journalsForLedger.map(async (ledgerJournalInfo, index) => {
            let journals;
            let particularList = []
            if(groupInfo.name == 'owners equity' || groupInfo.name == 'liabilities'){
                    // check if current journal is debit or credit, then get the opposite part of journals
                if(ledgerJournalInfo.isCredit){
                    //get opposite part of journals
                    journals = await GeneralJournal.find({
                        general_journal : ledgerJournalInfo.general_journal,
                        isCredit: false
                    }).select('isCredit subcategory').populate('subcategory', 'name').populate('supplier', 'name')
                    //create ledger
                    journals.map((dataInfo, index) => {
                        let journalDate = ("0" + ledgerJournalInfo.record_date.getDate()).slice(-2) + ' ' + months[ledgerJournalInfo.record_date.getMonth()] + ', ' + ledgerJournalInfo.record_date.getUTCFullYear() 
                        
                        if(dataInfo.subcategory != null){
                            particularList.push(dataInfo.subcategory.name) 
                        }else{
                            particularList.push(dataInfo.supplier.name) 
                        }

                        if(index == journals.length - 1){
                            ledgerList.push({
                                date: journalDate,
                                particular: particularList,
                                naration: ledgerJournalInfo.narration,
                                voucherNo: ledgerJournalInfo.general_journal.serialNo,
                                voucherType: ledgerJournalInfo.voucher.name,
                                chequeNo: ledgerJournalInfo.slip,
                                debit: null,
                                credit: ledgerJournalInfo.amount
                            })
                        }
                    })
                    grandTotalCredit += ledgerJournalInfo.amount
                }else{
                    journals = await GeneralJournal.find({
                        general_journal : ledgerJournalInfo.general_journal,
                        isCredit: true
                    }).select('isCredit subcategory').populate('subcategory', 'name').populate('supplier', 'name')
                   
                    journals.map((dataInfo, index) => {
                        let journalDate = ("0" + ledgerJournalInfo.record_date.getDate()).slice(-2) + ' ' + months[ledgerJournalInfo.record_date.getMonth()] + ', ' + ledgerJournalInfo.record_date.getUTCFullYear() 
                        
                        if(dataInfo.subcategory != null){
                            particularList.push(dataInfo.subcategory.name) 
                        }else{
                            particularList.push(dataInfo.supplier.name) 
                        }

                        if(index == journals.length - 1){
                            ledgerList.push({
                                date: journalDate,
                                particular: particularList,
                                naration: ledgerJournalInfo.narration,
                                voucherNo: ledgerJournalInfo.general_journal.serialNo,
                                voucherType: ledgerJournalInfo.voucher.name,
                                chequeNo: ledgerJournalInfo.slip,
                                debit: ledgerJournalInfo.amount,
                                credit: null
                            })
                        }
                    })
                    grandTotalDebit += ledgerJournalInfo.amount
                }
            }else if(groupInfo.name == 'assets'){
                    // check if current journal is debit or credit, then get the opposite part journals
                if(ledgerJournalInfo.isCredit){
                    journals = await GeneralJournal.find({
                        general_journal : ledgerJournalInfo.general_journal,
                        isCredit: false
                    }).select('isCredit subcategory').populate('subcategory', 'name').populate('supplier', 'name')
                    journals.map((dataInfo, index) => {
                        let journalDate = ("0" + ledgerJournalInfo.record_date.getDate()).slice(-2) + ' ' + months[ledgerJournalInfo.record_date.getMonth()] + ', ' + ledgerJournalInfo.record_date.getUTCFullYear() 
                        
                        if(dataInfo.subcategory != null){
                            particularList.push(dataInfo.subcategory.name) 
                        }else{
                            particularList.push(dataInfo.supplier.name) 
                        }

                        if(index == journals.length - 1){
                            ledgerList.push({
                                date: journalDate,
                                particular: particularList,
                                naration: ledgerJournalInfo.narration,
                                voucherNo: ledgerJournalInfo.general_journal.serialNo,
                                voucherType: ledgerJournalInfo.voucher.name,
                                chequeNo: ledgerJournalInfo.slip,
                                debit: null,
                                credit: ledgerJournalInfo.amount
                            }) 
                        }
                    })
                    grandTotalCredit += ledgerJournalInfo.amount
                }else{
                    journals = await GeneralJournal.find({
                        general_journal : ledgerJournalInfo.general_journal,
                        isCredit: true
                    }).select('isCredit subcategory').populate('subcategory', 'name').populate('supplier', 'name')
                    
                    journals.map((dataInfo, index) => {
                        let journalDate = ("0" + ledgerJournalInfo.record_date.getDate()).slice(-2) + ' ' + months[ledgerJournalInfo.record_date.getMonth()] + ', ' + ledgerJournalInfo.record_date.getUTCFullYear() 
                        
                        if(dataInfo.subcategory != null){
                            particularList.push(dataInfo.subcategory.name) 
                        }else{
                            particularList.push(dataInfo.supplier.name) 
                        }
                        
                        if(index == journals.length - 1){
                            ledgerList.push({
                                date: journalDate,
                                particular: particularList,
                                naration: ledgerJournalInfo.narration,
                                voucherNo: ledgerJournalInfo.general_journal.serialNo,
                                voucherType: ledgerJournalInfo.voucher.name,
                                chequeNo: ledgerJournalInfo.slip,
                                debit: ledgerJournalInfo.amount,
                                credit: null
                            })
                        }
                    })
                    grandTotalDebit += ledgerJournalInfo.amount
                }
            }else{
                // for incomes and expenses
                // check if current journal is debit or credit, then get the opposite part journals
                if(ledgerJournalInfo.isCredit){
                    journals = await GeneralJournal.find({
                        general_journal : ledgerJournalInfo.general_journal,
                        isCredit: false
                    }).select('isCredit subcategory').populate('subcategory', 'name').populate('supplier', 'name')
                    journals.map((dataInfo, index) => {
                        let journalDate = ("0" + ledgerJournalInfo.record_date.getDate()).slice(-2) + ' ' + months[ledgerJournalInfo.record_date.getMonth()] + ', ' + ledgerJournalInfo.record_date.getUTCFullYear() 
                        
                        if(dataInfo.subcategory != null){
                            particularList.push(dataInfo.subcategory.name) 
                        }else{
                            particularList.push(dataInfo.supplier.name) 
                        }
                        
                        if(index == journals.length - 1){
                            ledgerList.push({
                                date: journalDate,
                                particular: particularList,
                                naration: ledgerJournalInfo.narration,
                                voucherNo: ledgerJournalInfo.general_journal.serialNo,
                                voucherType: ledgerJournalInfo.voucher.name,
                                chequeNo: ledgerJournalInfo.slip,
                                debit: null,
                                credit: ledgerJournalInfo.amount
                            })
                        }
                    })
                    grandTotalCredit += ledgerJournalInfo.amount
                    
                }else{
                    journals = await GeneralJournal.find({
                        general_journal : ledgerJournalInfo.general_journal,
                        isCredit: true
                    }).select('isCredit subcategory').populate('subcategory', 'name').populate('supplier', 'name')
                    journals.map((dataInfo, index) => {
                        let journalDate = ("0" + ledgerJournalInfo.record_date.getDate()).slice(-2) + ' ' + months[ledgerJournalInfo.record_date.getMonth()] + ', ' + ledgerJournalInfo.record_date.getUTCFullYear() 
                        
                        if(dataInfo.subcategory != null){
                            particularList.push(dataInfo.subcategory.name) 
                        }else{
                            particularList.push(dataInfo.supplier.name) 
                        }
                        
                        if(index == journals.length - 1){
                            ledgerList.push({
                                date: journalDate,
                                particular: particularList,
                                naration: ledgerJournalInfo.narration,
                                voucherNo: ledgerJournalInfo.general_journal.serialNo,
                                voucherType: ledgerJournalInfo.voucher.name,
                                chequeNo: ledgerJournalInfo.slip,
                                debit: ledgerJournalInfo.amount,
                                credit: null
                            })
                        }
                    })
                    grandTotalDebit += ledgerJournalInfo.amount
                }
            } 
        })
        await Promise.all(journalsForLedgerArray)

        ledgerList = ledgerList.sort((a, b) => {
            return a.voucherNo - b.voucherNo
        })
        // calculate Balance for report
        ledgerList.map((ledgerInfo, index) => {
            if(index != 0){
                if(groupInfo.name == 'owners equity' || groupInfo.name == 'liabilities'){
                    if(ledgerInfo.credit == null){
                        ledgerInfo.balance = (openingBalance - Number(ledgerInfo.debit)).toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
                        openingBalance -= Number(ledgerInfo.debit)
                        ledgerInfo.debit = ledgerInfo.debit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
                    }else{
                        ledgerInfo.balance = (openingBalance + Number(ledgerInfo.credit)).toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
                        openingBalance += Number(ledgerInfo.credit)
                        ledgerInfo.credit = ledgerInfo.credit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
                    }                  
                 } 
                 if(groupInfo.name == 'assets'){
                     if(ledgerInfo.credit == null){
                        ledgerInfo.balance = (openingBalance + Number(ledgerInfo.debit)).toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
                        openingBalance += Number(ledgerInfo.debit)
                        ledgerInfo.debit = ledgerInfo.debit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
                     }else{
                        ledgerInfo.balance = (openingBalance - Number(ledgerInfo.credit)).toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
                        openingBalance -= Number(ledgerInfo.credit)
                        ledgerInfo.credit = ledgerInfo.credit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
                     }                  
                }
            }
            if(groupInfo.name == 'incomes' || groupInfo.name == 'expenses'){
                if(ledgerInfo.credit == null){
                    ledgerInfo.debit = ledgerInfo.debit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
                 }else{
                    ledgerInfo.credit = ledgerInfo.credit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
                 }
            }
        })


        if(condition.supplier == undefined){
            allDataItems.push({
                group: groupInfo.name,
                subgroup : journalsForLedger[0].subgroup.name,
                category : journalsForLedger[0].category.name,
                subcategory : journalsForLedger[0].subcategory.name,
                isSupplier: false,
                ledgers : ledgerList,
                notIncomeExpense: (groupInfo.name == 'incomes' || groupInfo.name == 'expenses') ? false : true
            })
        }else{
            allDataItems.push({
                group: groupInfo.name,
                subgroup : journalsForLedger[0].subgroup.name,
                category : journalsForLedger[0].category.name,
                supplier : journalsForLedger[0].supplier.name,
                isSupplier: true,
                ledgers : ledgerList,
                notIncomeExpense: (groupInfo.name == 'incomes' || groupInfo.name == 'expenses') ? false : true
            })
        }

    }else{
        let subgroupInfo;
        let categoryInfo;
        subgroupInfo = await Subgroup.findOne({
            _id: condition.subgroup
        }).select('name')
        categoryInfo = await Category.findOne({
            _id: condition.category
        }).select('name')
        
        if(condition.subcategory != undefined){
            let openingBalanceDate = (closingBalance == 0) ?  subcategoryInfo.create : from
            allDataItems.push({
                group: groupInfo.name,
                subgroup : groupInfo.name,
                category : categoryInfo.name,
                subcategory : subcategoryInfo.name,
                isSupplier: false,
                ledgers : [{
                    date: ("0" + openingBalanceDate.getDate()).slice(-2) + '-' + months[openingBalanceDate.getMonth()] + '-' + openingBalanceDate.getUTCFullYear(),
                    particular: ["Opening Balance"],
                    naration: "",
                    voucherNo: null,
                    voucherType: "",
                    debit: null,
                    credit: null,
                    balance: closingBalance.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})  
                }],
                notIncomeExpense: (groupInfo.name == 'incomes' || groupInfo.name == 'expenses') ? false : true
            })
        }else{
            allDataItems.push({
                group: groupInfo.name,
                subgroup : subgroupInfo.name,
                category : categoryInfo.name,
                supplier : supplierInfo.name,
                isSupplier: true,
                ledgers : [{
                    date: ("0" + from.getDate()).slice(-2) + '-' + months[from.getMonth()] + '-' + from.getUTCFullYear(),
                    particular: ["Opening Balance"],
                    naration: "",
                    voucherNo: null,
                    voucherType: "",
                    debit: null,
                    credit: null,
                    balance: closingBalance.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})  
                }],
                notIncomeExpense: (groupInfo.name == 'incomes' || groupInfo.name == 'expenses') ? false : true
            })
        }
    }
    
    if (type == 'excel') {
        let mainData = []
        let group;
        let subgroup;
        let category;
        let particular;

        allDataItems.map((info) => {
            group = info.group
            subgroup = info.subgroup
            category = info.category
            if(info.subcategory != undefined){
                particular = info.subcategory
            }else{
                particular = info.supplier
            }
            info.ledgers.map((ledgerInfo, index) => {
                let dataObj = {}
                dataObj.date = ledgerInfo.date
                dataObj.particular = ledgerInfo.particular
                dataObj.narration = ledgerInfo.naration
                dataObj.voucherNo = ledgerInfo.voucherNo
                dataObj.voucher = ledgerInfo.voucherType
                dataObj.debit = ledgerInfo.debit
                dataObj.credit = ledgerInfo.credit
                dataObj.balance = ledgerInfo.balance

                mainData.push(dataObj)

            })
        })
        process.send({
            mainData,
            grandTotalDebit,
            grandTotalCredit,
            group,
            subgroup,
            category,
            particular
        });
    } else {
        process.send({
            allDataItems,
            grandTotalDebit,
            grandTotalCredit
        });
    }
});