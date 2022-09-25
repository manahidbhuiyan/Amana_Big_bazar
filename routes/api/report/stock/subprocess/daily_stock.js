var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const CategoryWiseDailyStock = require('../../../../../models/CategoryWiseDailyStock');
const Branch = require('../../../../../models/Branch');

process.on('message', async (msg) => {
    let { from, to, condition, type } = msg
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    from = new Date(from)
    to = new Date(to)
    let branches = []

    let categoryWiseDailyStocks = await CategoryWiseDailyStock.find(condition).populate('branch', 'name phone address')

    if(condition.branch != undefined){
        branches = await Branch.find({_id : condition.branch})
    }else{
        branches = await Branch.find()
    }

    let allDailyStockData = []
    let grandtotalQuantity = 0
    let grandtotalSellAmount = 0
    let grandtotalCostAmount = 0
    let grandtotalGp = 0
    let branchesArray = branches.map(async (branchInfo) => {
        let branchWiseStock = {
            branch : branchInfo.name ? branchInfo.name : '',
            phone : branchInfo.phone ? branchInfo.phone : '',
            address : branchInfo.address ? branchInfo.address : '',
            stockData : [],
            subtotalQuantity : 0,
            subtotalSellAmount : 0,
            subtotalCostAmount : 0
        }
        let categoryWiseDailyStocksArray = categoryWiseDailyStocks.map(async (dailyStockData) => {
            if(dailyStockData.branch !== null){
                if(String(branchInfo._id) == String(dailyStockData.branch._id)){   
                    let createDate = new Date(dailyStockData.create)
                    let stockData = {
                        date: ("0" + createDate.getDate()).slice(-2) + ' ' + months[createDate.getMonth()] + ', ' + createDate.getUTCFullYear(),
                        totalQuantity: dailyStockData.totalQuantity ? dailyStockData.totalQuantity.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : 0,
                        totalCostAmount: dailyStockData.totalCostAmount ? dailyStockData.totalCostAmount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : 0,
                        totalEarnAmount : dailyStockData.totalSellAmount ? dailyStockData.totalSellAmount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : 0,
                        totalGp : dailyStockData.totalGp ? dailyStockData.totalGp.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : 0,
                    }

                    branchWiseStock.stockData.push(stockData)

                    branchWiseStock.subtotalQuantity +=  dailyStockData.totalQuantity ? dailyStockData.totalQuantity : 0
                    grandtotalQuantity += dailyStockData.totalQuantity ? dailyStockData.totalQuantity : 0
                    branchWiseStock.subtotalSellAmount += dailyStockData.totalSellAmount ? dailyStockData.totalSellAmount : 0
                    grandtotalSellAmount += dailyStockData.totalSellAmount ? dailyStockData.totalSellAmount : 0
                    branchWiseStock.subtotalCostAmount += dailyStockData.totalCostAmount ?  dailyStockData.totalCostAmount : 0
                    grandtotalCostAmount += dailyStockData.totalCostAmount ?  dailyStockData.totalCostAmount : 0
                }
            }
        })
        branchWiseStock.stockData.sort( function (a,b) {
            return a.date.localeCompare(b.date)
        }),
        branchWiseStock.subtotalQuantity = branchWiseStock.subtotalQuantity.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
        branchWiseStock.subtotalSellAmount = branchWiseStock.subtotalSellAmount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
        branchWiseStock.subtotalCostAmount = branchWiseStock.subtotalCostAmount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})

        allDailyStockData.push(branchWiseStock)
        await Promise.all(categoryWiseDailyStocksArray)
    })
    await Promise.all(branchesArray)

    if (grandtotalSellAmount != 0) {
        grandtotalGp = (((grandtotalSellAmount - grandtotalCostAmount) / grandtotalSellAmount) * 100)
    }

    if (type == 'excel') {
        let mainData = []
        allDailyStockData.map((info) => {
            mainData.push({
                date: ' ',
                totalQuantity: ' ',
                totalCostAmount: ' ',
                totalSellAmount: ' ',
                totalGp: ' '
            })
            mainData.push({
                date: info.date,
                totalQuantity: Number(info.totalQuantity),
                totalCostAmount: Number(info.totalCostAmount),
                totalSellAmount: Number(info.totalSellAmount),
                totalGp: Number(info.totalGp)
            })
        })
        process.send({
            mainData,
            grandtotalQuantity,
            grandtotalSellAmount,
            grandtotalCostAmount,
            grandtotalGp
        });
    } else {
        process.send({
            allDailyStockData,
            grandtotalQuantity,
            grandtotalSellAmount,
            grandtotalCostAmount,
            grandtotalGp
        });
    }
});