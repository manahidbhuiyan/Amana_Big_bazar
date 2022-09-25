var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()

const Product = require('../../../../../models/Product');
const Branch = require('../../../../../models/Branch');
const Category = require('../../../../../models/Category');
const SubCategory = require('../../../../../models/SubCategory');
const Brand = require('../../../../../models/BrandName');
const Supplier = require('../../../../../models/Supplier');
const ProductWeightUnit = require('../../../../../models/ProductWeightUnit');
const ProductSize = require('../../../../../models/ProductSize');

process.on('message', async (msg) => {
    let {type, condition } = msg
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let allProducts = []
    let allBranchProducts = await Product.find(condition)
                            .populate('branch', 'name')
                            .populate('category', 'name')
                            .populate('subcategory', 'name')
                            .populate('brand', 'name')
                            .populate('supplier', 'name')
                            .populate('unitType', 'name shortform')
                            .populate('availableSize', 'name shortform')

    
    
    let allBranchProductsArray = allBranchProducts.map(async (productInfo) => {
        let expireDate = '-'
        let sizes = []
        if(productInfo.expireDate){
            expireDate = new Date(productInfo.create)
            expireDate = ("0" + expireDate.getDate()).slice(-2) + ' ' + months[expireDate.getMonth()] + ', ' + expireDate.getUTCFullYear()
        }
        if(productInfo.availableSize.length > 0){
            productInfo.availableSize.map(sizeInfo => {
                sizes.push(sizeInfo.name)
            })
        }
        allProducts.push({
            branch : productInfo.branch.name,
            category : productInfo.category.name,
            subcategory : productInfo.subcategory.name,
            brand : productInfo.brand.name,
            supplier : productInfo.supplier.name,
            barcode : productInfo.barcode,
            name : productInfo.name,
            quantity : productInfo.quantity,
            sell : productInfo.price.sell,
            purchase : productInfo.price.purchase,
            discount : productInfo.discount,
            vat : productInfo.vat,
            description : productInfo.description,
            reorderLevel : productInfo.reorderLevel,
            unitType : productInfo.unitType ? productInfo.unitType.name : '-',
            expireDate : expireDate,
            weight : productInfo.weight ? productInfo.weight : '-',
            size : productInfo.availableSize.length > 0 ? sizes : '-',

        })
    })
    await Promise.all(allBranchProductsArray)
    
    process.send({
        allProducts
    });
});