const ProductDiscount = require('../../../models/Tracking/Transaction/ProductDiscount');
const Product = require('../../../models/Product');

let applyScheduledDiscount = async (branchID) => {
    let todaysDate = new Date();
    let month = ("0" + (todaysDate.getMonth() + 1)).slice(-2); 
    let date = ("0" + todaysDate.getDate()).slice(-2); 
    let year = todaysDate.getFullYear(); 

    let fromDate = new Date(year +'-'+ month +'-'+ date)

    const discountList = await ProductDiscount.find({
        branch: branchID,
        startDiscount: false,
        discount_start: fromDate
    })

    let discountListArrayLoop = discountList.map(async discountInfo=>{
        let productDiscountInfo = await ProductDiscount.findById(discountInfo._id)
        productDiscountInfo.startDiscount = true 
        await productDiscountInfo.save()
        
        let productLoopSubArray = discountInfo.products.map(async productInfo=>{
            let productInfoData = await Product.findById(productInfo._id)

            productInfoData.specialOffer = true
            productInfoData.discount = productInfo.discount

            await productInfoData.save()
        })

        await Promise.all(productLoopSubArray)
    })

    await Promise.all(discountListArrayLoop)
}

module.exports = applyScheduledDiscount