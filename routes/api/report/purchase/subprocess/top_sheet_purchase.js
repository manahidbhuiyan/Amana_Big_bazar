var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const ReceiveFromSupplier = require('../../../../../models/Tracking/Transaction/ReceiveFromSupplier');
const supplier = require('../../../../../models/Supplier');

process.on('message', async (msg) => {
    let { from, to, branch, } = msg

    from = new Date(from)
    to = new Date(to)

    let supplierOfBranch = await Supplier.find({
        branch: {
            $in: branch
        }
    }).select("_id name")


    let allSupplierInfo = []
    let grandTotalQuantity = 0
    let grandTotalCostAmount = 0
    let grandTotalSellAmount = 0

    let finalArray = await supplierOfBranch.map(async (supplierInfo, index) => {
        let supplierRecevingData = await ReceiveFromSupplier.find({
            supplier: supplierInfo._id,
            branch: branch,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('_id serialNo chalan_no totalAmount totalQuantity create products')

        // let supplierInfoDataList = [] 
        let supplierTotalQuantity = 0
        let supplierTotalCostAmount = 0
        let supplierTotalSellAmount = 0


        let childArray = await supplierRecevingData.map(async (receivingInfo, index) => {

            let grandChild = await receivingInfo.products.map((productInfo, index) => {
                supplierTotalSellAmount += (productInfo.product.price.sell * productInfo.product.quantity)
            })

            await Promise.all(grandChild);
            supplierTotalQuantity += Number(receivingInfo.totalQuantity)
            supplierTotalCostAmount += receivingInfo.totalAmount
        })

        await Promise.all(childArray);

        grandTotalCostAmount += supplierTotalCostAmount
        grandTotalSellAmount += supplierTotalSellAmount
        grandTotalQuantity += supplierTotalQuantity

        if (supplierTotalQuantity != 0) {
            allSupplierInfo.push({
                supplier: supplierInfo.name,
                // data: supplierInfoDataList,
                supplierTotalQuantity: Number(supplierTotalQuantity).toFixed(2),
                supplierTotalCostAmount: Number(supplierTotalCostAmount).toFixed(2),
                supplierTotalSellAmount: Number(supplierTotalSellAmount).toFixed(2),
                supplierGrossProfitAmount: (supplierTotalSellAmount - supplierTotalCostAmount).toFixed(2),
                supplierGrossProfitPercentage: (((supplierTotalSellAmount - supplierTotalCostAmount) / supplierTotalCostAmount) * 100).toFixed(2)
            })
        }
    })

    await Promise.all(finalArray);


    process.send({
        allSupplierInfo,
        grandTotalCostAmount,
        grandTotalSellAmount,
        grandTotalQuantity
    });

});