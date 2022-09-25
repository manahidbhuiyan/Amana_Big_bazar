var mongoConnection = require('../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const NoPaymentReset = require('../../../../models/NoPaymentReset');
const Admin = require('../../../../models/admin/Admin');

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg

    from = new Date(from)
    to = new Date(to)

    let noPaymentResetItems = await NoPaymentReset.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })

    let reportData = []

    let totalQunatity = 0;
    let totalPurchaseAmount = 0;
    let totalVat = 0;
    let totalDiscountAmount = 0;

    let orderListParentArray = noPaymentResetItems.map(async (item, index) => {

        let admin = await Admin.findOne({
            _id: item.admin
        }).select('name');

        let index2 = item.create.toString().indexOf("G")
        let date = item.create.toString().substring(0, index2)

        let orderListChildOneArray = item.products.map(async product => {
            let productPurchaseAmount = 0;
            productPurchaseAmount += (product.sell_price * product.quantity)
            reportData.push({
                date: date,
                barcode: product.barcode,
                name: product.name,
                quantity: (type == 'pdf') ? product.quantity.toFixed(2) : product.quantity,
                price: (type == 'pdf') ? product.sell_price.toFixed(2) : product.sell_price,
                salesAmt: (type == 'pdf') ? productPurchaseAmount.toFixed(2) : productPurchaseAmount,
                discount: (type == 'pdf') ? product.discount.toFixed(2) : product.discount,
                vat: (type == 'pdf') ? product.vat.toFixed(2) : product.vat,
                User: admin.name
            })
            totalQunatity += product.quantity
            totalPurchaseAmount += productPurchaseAmount
            totalVat += product.vat
            totalDiscountAmount += product.discount
        })
        await Promise.all(orderListChildOneArray)
    })
    await Promise.all(orderListParentArray)

    process.send({
        reportData,
        totalQunatity,
        totalPurchaseAmount,
        totalVat,
        totalDiscountAmount
    });

});