// var mongoConnection = require('../../../../../config/connectMongo')
// mongoConnection()
// var isodate = require("isodate");

// const OrderForPos = require('../../../../../models/OrderForPos');

// process.on('message', async (msg) => {
//     let { from, to, branch, type } = msg

//     from = new Date(from)
//     to = new Date(to)

//     let posOrderData = await OrderForPos.find({
//         branch: branch,
//         create: {
//             $gte: isodate(from),
//             $lte: isodate(to)
//         }
//     }).select('customer used_points orderID create')


//     let totalDiscountAmount = 0;
//     let totalPoint = 0;
//     let reportInfo = []
//     let posOrderArray = posOrderData.map(async (orderInfo) => {

//         let index = ((orderInfo.create).toISOString()).indexOf("T")
//         let createDate = ((orderInfo.create).toISOString()).substring(0, index)
//         reportInfo.push({
//             orderNo: orderInfo.orderID,
//             customerName: orderInfo.customer.name,
//             customerPhone: orderInfo.customer.phone,
//             date: createDate,
//             usedPoint: type == 'pdf' ? orderInfo.used_points.toFixed(2) : orderInfo.used_points,
//             pointDiscount: type == 'pdf' ? (orderInfo.used_points * 0.8).toFixed(2) : (orderInfo.used_points * 0.8)
//         })
//         totalDiscountAmount += (orderInfo.used_points * 0.8)
//         totalPoint += orderInfo.used_points

//     })

//     await Promise.all(posOrderArray)

//     reportInfo = reportInfo.filter(data => data.pointDiscount != 0)

//     process.send({
//         reportInfo,
//         totalPoint,
//         totalDiscountAmount
//     });

// });



var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");

const OrderForPos = require('../../../../../models/OrderForPos');

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg

    from = new Date(from)
    to = new Date(to)

    let posOrderData = await OrderForPos.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).select('customer used_points orderID create')


    let totalDiscountAmount = 0;
    let totalPoint = 0
    let reportInfo = []
    //let users = []
    let posOrderArray = posOrderData.map(async (orderInfo) => {
        let userIndex = reportInfo.findIndex((userInfo) => userInfo.customerPhone == orderInfo.customer.phone)
        if(userIndex == -1){
            reportInfo.push({
                customerName: orderInfo.customer.name,
                customerPhone: orderInfo.customer.phone,
                usedPoint: Number(orderInfo.used_points),
                pointDiscount: Number((orderInfo.used_points * 0.8).toFixed(2))
            })
            totalDiscountAmount += Number((orderInfo.used_points * 0.8).toFixed(2))
            totalPoint += orderInfo.used_points
        }else{
            reportInfo[userIndex].usedPoint += Number(orderInfo.used_points)
            reportInfo[userIndex].pointDiscount += Number((orderInfo.used_points * 0.8).toFixed(2))
            totalDiscountAmount += Number((orderInfo.used_points * 0.8).toFixed(2))
            totalPoint += orderInfo.used_points
        }
    })

    await Promise.all(posOrderArray)



    reportInfo = reportInfo.filter(data => data.pointDiscount != 0)

    process.send({
        reportInfo,
        totalPoint,
        totalDiscountAmount
    });

});





















