var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");

const OrderForPos = require('../../../../../models/OrderForPos');
const PersonalDiscount = require('../../../../../models/PersonalDiscount');

process.on('message', async (msg) => {
    let { from, to, branch } = msg

    from = new Date(from)
    to = new Date(to)

    let personalDiscount = await PersonalDiscount.find({}).select("_id name personID person_type phone active max_discount_percentage")
    let length = personalDiscount.length
    let allPersonalDiscountDataList = []
    let grandTotalPersonalDiscountAmount = 0
    let grandAvgPersonalDiscountPercentage = 0


    let finalArray = await personalDiscount.map(async (personalDiscountInfo, index) => {
        let personalDiscountApplyOnOrder = await OrderForPos.find({
            discountPerson: personalDiscountInfo._id,
            branch: branch,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('_id orderID total_bill personalDiscountAmount personalDiscountPercentage')

        let personalDiscountDataList = []
        let totalPersonalDiscountAmount = 0
        let avgPersonalDiscount = 0

        let childArray = personalDiscountApplyOnOrder.map(discountInfo => {
            personalDiscountDataList.push([discountInfo.orderID, (discountInfo.total_bill + discountInfo.personalDiscountAmount), discountInfo.personalDiscountAmount, discountInfo.personalDiscountPercentage])

            totalPersonalDiscountAmount += discountInfo.personalDiscountAmount
            avgPersonalDiscount += discountInfo.personalDiscountPercentage
        })

        await Promise.all(childArray)

        allPersonalDiscountDataList.push({
            personalInfo: [personalDiscountInfo.personID, personalDiscountInfo.name, personalDiscountInfo.phone, personalDiscountInfo.person_type, personalDiscountInfo.max_discount_percentage],
            discountList: personalDiscountDataList,
            totalDiscountAmount: totalPersonalDiscountAmount,
            totalDiscountPercentage: avgPersonalDiscount == 0 ? 0 : (avgPersonalDiscount / personalDiscountApplyOnOrder.length),
        })

        grandTotalPersonalDiscountAmount += totalPersonalDiscountAmount
        grandAvgPersonalDiscountPercentage += avgPersonalDiscount == 0 ? 0 : (avgPersonalDiscount / personalDiscountApplyOnOrder.length)
    })

    await Promise.all(finalArray);

    process.send({
        allPersonalDiscountDataList,
        grandTotalPersonalDiscountAmount,
        grandAvgPersonalDiscountPercentage,
        length
    });

});










