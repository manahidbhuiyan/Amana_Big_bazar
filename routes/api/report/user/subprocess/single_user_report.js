
var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const POSUser = require('../../../../../models/PosUser');
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');
const admin = require('../../../../../models/admin/Admin');
const branch = require('../../../../../models/Branch');

process.on('message', async (msg) => {
    let {
        from,
        to,
        identification,
        id_type,
        branch_id
    } = msg

    from = new Date(from)
    to = new Date(to)

    let serachPosClientCondition = {};

    if (id_type == 'id') {
        serachPosClientCondition.clientID = identification
    } else {
        serachPosClientCondition.phone = identification
    }

    let posUser = await POSUser.findOne(serachPosClientCondition)

    let orderListCondition = {
        "customer.phone": posUser.phone,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }

    if (branch_id) {
        orderListCondition.branch = branch_id
    }

    let orderListItems = await OrderForPos.find(orderListCondition).select('_id orderID orderType create products sub_total_bill vat discount total_bill create').populate('admin', 'name').populate('branch', 'name address')

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let orderInfoUserWise = []
    let grandTotal = 0

    let parentArray = await orderListItems.map(async orderInfo => {
        let productsData = []

        let childArray = await orderInfo.products.map(async orderedProduct => {
            let orderDiscount = (orderedProduct.price * orderedProduct.quantity) * (orderedProduct.discount / 100)
            let totalPrice = (orderedProduct.price * orderedProduct.quantity)
            productsData.push([orderedProduct.code, orderedProduct.name, orderedProduct.price, orderedProduct.quantity, orderDiscount.toFixed(2), (totalPrice - orderDiscount).toFixed(2)])
        })

        await Promise.all(childArray)

        let orderCreateDate = new Date(orderInfo.create)

        grandTotal += orderInfo.total_bill

        if (orderInfo.total_bill > 0) {
            orderInfoUserWise.push({
                orderID: orderInfo.orderID,
                orderType: orderInfo.orderType,
                branchName: orderInfo.branch.name,
                branchAddress: orderInfo.branch.address,
                receiptCreator: orderInfo.admin.name,
                totalDiscount: orderInfo.discount.product + orderInfo.discount.others,
                subtotal: orderInfo.sub_total_bill,
                vat: orderInfo.vat,
                total_bill: orderInfo.total_bill,
                products: productsData,
                create: ("0" + orderCreateDate.getDate()).slice(-2) + ' ' + months[orderCreateDate.getMonth()] + ', ' + orderCreateDate.getUTCFullYear() + ' ' + orderCreateDate.getHours() + ':' + ("0" + orderCreateDate.getMinutes()).slice(-2) + ':' + orderCreateDate.getHours()
            })
        }


        let exchangeInfo = await PosOrderExchange.find({
            posOrder: orderInfo._id,
            customer: null,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('_id serialNo create products sub_total_bill vat discount slip_point total_bill exchange_amount').populate('admin', 'name').populate('branch', 'name address')

        let childArray1 = exchangeInfo.map(async exchangeSingleInfo => {
            let exchangedProductsData = []
            let grandChildArray = exchangeSingleInfo.products.map(async exchangedProduct => {
                let exchangeDiscount = (exchangedProduct.price * exchangedProduct.quantity) * (exchangedProduct.discount / 100)
                let totalPrice = (exchangedProduct.price * exchangedProduct.quantity)
                exchangedProductsData.push([exchangedProduct.code, exchangedProduct.name, exchangedProduct.price, exchangedProduct.quantity, exchangeDiscount.toFixed(2), (totalPrice - exchangeDiscount).toFixed(2)])
            })

            await Promise.all(grandChildArray)

            let exchangeCreateDate = new Date(exchangeSingleInfo.create)

            grandTotal += (exchangeSingleInfo.total_bill - exchangeSingleInfo.exchange_amount)

            if (exchangeSingleInfo.total_bill > 0) {
                orderInfoUserWise.push({
                    orderID: exchangeSingleInfo.serialNo,
                    orderType: 'exchange',
                    branchName: exchangeSingleInfo.branch.name,
                    branchAddress: exchangeSingleInfo.branch.address,
                    receiptCreator: exchangeSingleInfo.admin.name,
                    totalDiscount: exchangeSingleInfo.discount.product + exchangeSingleInfo.discount.others + exchangeSingleInfo.exchange_amount,
                    subtotal: exchangeSingleInfo.sub_total_bill,
                    vat: exchangeSingleInfo.vat,
                    total_bill: exchangeSingleInfo.total_bill,
                    products: exchangedProductsData,
                    create: ("0" + exchangeCreateDate.getDate()).slice(-2) + ' ' + months[exchangeCreateDate.getMonth()] + ', ' + exchangeCreateDate.getUTCFullYear() + ' ' + exchangeCreateDate.getHours() + ':' + ("0" + exchangeCreateDate.getMinutes()).slice(-2) + ':' + exchangeCreateDate.getHours()
                })
            }
        })

        await Promise.all(childArray1)



        let refundInfo = await PosOrderRefund.find({
            posOrder: orderInfo._id,
            customer: null,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('_id serialNo create products sub_total_bill vat discount slip_point_removed total_bill').populate('admin', 'name').populate('branch', 'name address')

        let childArray2 = refundInfo.map(async refundSingleInfo => {
            let refundProductsData = []
            let grandChildArray1 = refundSingleInfo.products.map(async refundProduct => {
                let refundDiscount = (refundProduct.price * refundProduct.quantity) * (refundProduct.discount / 100)
                let totalPrice = (refundProduct.price * refundProduct.quantity)
                refundProductsData.push([refundProduct.code, refundProduct.name, refundProduct.price, refundProduct.quantity, refundDiscount.toFixed(2), (totalPrice - refundDiscount).toFixed(2)])
            })

            await Promise.all(grandChildArray1)

            let refundCreateDate = new Date(refundSingleInfo.create)

            grandTotal -= refundSingleInfo.total_bill

            if (refundSingleInfo.total_bill > 0) {
                orderInfoUserWise.push({
                    orderID: refundSingleInfo.serialNo,
                    orderType: 'refund',
                    branchName: refundSingleInfo.branch.name,
                    branchAddress: refundSingleInfo.branch.address,
                    receiptCreator: refundSingleInfo.admin.name,
                    totalDiscount: refundSingleInfo.discount.product + refundSingleInfo.discount.others,
                    subtotal: refundSingleInfo.sub_total_bill,
                    vat: refundSingleInfo.vat,
                    total_bill: refundSingleInfo.total_bill,
                    products: refundProductsData,
                    create: ("0" + refundCreateDate.getDate()).slice(-2) + ' ' + months[refundCreateDate.getMonth()] + ', ' + refundCreateDate.getUTCFullYear() + ' ' + refundCreateDate.getHours() + ':' + ("0" + refundCreateDate.getMinutes()).slice(-2) + ':' + refundCreateDate.getHours()
                })
            }
        })

        await Promise.all(childArray2)

    })

    await Promise.all(parentArray)


    let exchangeInfo = await PosOrderExchange.find(orderListCondition).select('_id serialNo create products sub_total_bill vat discount slip_point total_bill exchange_amount').populate('admin', 'name').populate('branch', 'name address')

    let childArray1 = exchangeInfo.map(async exchangeSingleInfo => {
        let exchangedProductsData = []
        let grandChildArray = exchangeSingleInfo.products.map(async exchangedProduct => {
            let exchangeDiscount = (exchangedProduct.price * exchangedProduct.quantity) * (exchangedProduct.discount / 100)
            let totalPrice = (exchangedProduct.price * exchangedProduct.quantity)
            exchangedProductsData.push([exchangedProduct.code, exchangedProduct.name, exchangedProduct.price, exchangedProduct.quantity, exchangeDiscount.toFixed(2), (totalPrice - exchangeDiscount).toFixed(2)])
        })

        await Promise.all(grandChildArray)

        let exchangeCreateDate = new Date(exchangeSingleInfo.create)

        grandTotal += (exchangeSingleInfo.total_bill - exchangeSingleInfo.exchange_amount)

        if (exchangeSingleInfo.total_bill > 0) {
            orderInfoUserWise.push({
                orderID: exchangeSingleInfo.serialNo,
                orderType: 'exchange',
                branchName: exchangeSingleInfo.branch.name,
                branchAddress: exchangeSingleInfo.branch.address,
                receiptCreator: exchangeSingleInfo.admin.name,
                totalDiscount: exchangeSingleInfo.discount.product + exchangeSingleInfo.discount.others,
                subtotal: exchangeSingleInfo.sub_total_bill,
                vat: exchangeSingleInfo.vat,
                total_bill: exchangeSingleInfo.total_bill,
                products: exchangedProductsData,
                create: ("0" + exchangeCreateDate.getDate()).slice(-2) + ' ' + months[exchangeCreateDate.getMonth()] + ', ' + exchangeCreateDate.getUTCFullYear() + ' ' + exchangeCreateDate.getHours() + ':' + ("0" + exchangeCreateDate.getMinutes()).slice(-2) + ':' + exchangeCreateDate.getHours()
            })
        }
    })

    await Promise.all(childArray1)



    let refundInfo = await PosOrderRefund.find(orderListCondition).select('_id serialNo create products sub_total_bill vat discount slip_point_removed total_bill').populate('admin', 'name').populate('branch', 'name address')

    let childArray2 = refundInfo.map(async refundSingleInfo => {
        let refundProductsData = []
        let grandChildArray1 = refundSingleInfo.products.map(async refundProduct => {
            let refundDiscount = (refundProduct.price * refundProduct.quantity) * (refundProduct.discount / 100)
            let totalPrice = (refundProduct.price * refundProduct.quantity)
            refundProductsData.push([refundProduct.code, refundProduct.name, refundProduct.price, refundProduct.quantity, refundDiscount.toFixed(2), (totalPrice - refundDiscount).toFixed(2)])
        })

        await Promise.all(grandChildArray1)

        let refundCreateDate = new Date(refundSingleInfo.create)

        grandTotal -= refundSingleInfo.total_bill

        if (refundSingleInfo.total_bill > 0) {
            orderInfoUserWise.push({
                orderID: refundSingleInfo.serialNo,
                orderType: 'refund',
                branchName: refundSingleInfo.branch.name,
                branchAddress: refundSingleInfo.branch.address,
                receiptCreator: refundSingleInfo.admin.name,
                totalDiscount: refundSingleInfo.discount.product + refundSingleInfo.discount.others,
                subtotal: refundSingleInfo.sub_total_bill,
                vat: refundSingleInfo.vat,
                total_bill: refundSingleInfo.total_bill,
                products: refundProductsData,
                create: ("0" + refundCreateDate.getDate()).slice(-2) + ' ' + months[refundCreateDate.getMonth()] + ', ' + refundCreateDate.getUTCFullYear() + ' ' + refundCreateDate.getHours() + ':' + ("0" + refundCreateDate.getMinutes()).slice(-2) + ':' + refundCreateDate.getHours()
            })
        }
    })

    await Promise.all(childArray2)

    process.send({
        grandTotal,
        posUser,
        orderInfoUserWise
    });
});