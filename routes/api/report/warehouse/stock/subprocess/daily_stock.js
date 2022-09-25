var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const CategoryWiseDailyStock = require('../../../../../../models/CategoryWiseDailyStock');

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    from = new Date(from)
    to = new Date(to)

    let categoryWiseDailyStocks = await CategoryWiseDailyStock.find({
        branch: null,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })

    let allDailyStockData = []
    let grandtotalQuantity = 0
    let grandtotalSellAmount = 0
    let grandtotalCostAmount = 0
    let grandtotalGp = 0
    let categoryWiseDailyStocksArray = categoryWiseDailyStocks.map(async (dailyStockData) => {
        let createDate = new Date(dailyStockData.create)
        let stockData = {
            date: ("0" + createDate.getDate()).slice(-2) + ' ' + months[createDate.getMonth()] + ', ' + createDate.getUTCFullYear(),
            totalQuantity: dailyStockData.totalQuantity ? dailyStockData.totalQuantity.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : 0,
            totalCostAmount: dailyStockData.totalCostAmount ? dailyStockData.totalCostAmount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : 0,
            totalEarnAmount : dailyStockData.totalEarnAmount ? dailyStockData.totalEarnAmount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : 0,
            totalGp : dailyStockData.totalGp ? dailyStockData.totalGp.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : 0,
        }
        allDailyStockData.push(stockData)
        grandtotalQuantity +=  dailyStockData.totalQuantity ? dailyStockData.totalQuantity : 0
        grandtotalSellAmount += dailyStockData.totalEarnAmount ? dailyStockData.totalEarnAmount : 0
        grandtotalCostAmount += dailyStockData.totalCostAmount ?  dailyStockData.totalCostAmount : 0
    })
    await Promise.all(categoryWiseDailyStocksArray)

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
                totalEarnAmount: ' ',
                totalGp: ' '
            })
            mainData.push({
                date: info.date,
                totalQuantity: Number(info.totalQuantity),
                totalCostAmount: Number(info.totalCostAmount),
                totalEarnAmount: Number(info.totalEarnAmount),
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