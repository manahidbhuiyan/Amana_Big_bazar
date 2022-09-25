const express = require('express');
const router = express.Router();

const config = require('config')

const OrderForPos = require('../../../models/OrderForPos');
const OrderExchange = require('../../../models/PosOrderExchange');
const OrderRefund = require('../../../models/PosOrderRefund');

var isodate = require("isodate");
const adminAuth = require('../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

const Admin = require('../../../models/admin/Admin');
const PosOrderExchange = require('../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../models/PosOrderRefund');

// @route GET api/order
// @description Get all the orders
// @access Private
router.get('/list/:pageNo', [adminAuth], async (req, res) => {

    try {

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let branch = req.query.branch

        let condition = {
            branch
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'order_phone') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else if (columnName == 'order_status') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else {
                condition = {
                    [columnName]: parseInt(text),
                    branch
                }
            }

        }

        let order = await OrderForPos.find(condition).populate('branch', ['name']).limit(dataList).skip(offset).sort({
            "_id": -1
        })


        res.status(200).json({
            data: order
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/order
// @description Get all the orders
// @access Private
router.get('/dashboard/list/:pageNo', [adminAuth], async (req, res) => {

    try {

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'dashboard')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let branch = req.query.branch

        let condition = {
            branch
        }

        let currentDate = new Date()

        let todayDate = currentDate.getUTCFullYear()+"-"+(currentDate.getUTCMonth()+1)+"-"+currentDate.getUTCDate()

        let from = new Date(todayDate)
        let to = new Date(todayDate)

        if(config.get('shopTimeZone').type=='+'){
            to.setHours(currentDate.getUTCHours()+config.get('shopTimeZone').difference.hours)
            to.setMinutes(currentDate.getUTCMinutes()+config.get('shopTimeZone').difference.munites)
            to.setSeconds(currentDate.getUTCSeconds()+config.get('shopTimeZone').difference.second)
        }else{
            to.setHours(currentDate.getUTCHours()-config.get('shopTimeZone').difference.hours)
            to.setMinutes(currentDate.getUTCMinutes()-config.get('shopTimeZone').difference.munites)
            to.setSeconds(currentDate.getUTCSeconds()-config.get('shopTimeZone').difference.second)
        }

        if(from > to){
            from.setDate(from.getDate()-1) 
        }
        


        if(req.query.from && req.query.to) {
            from = new Date(req.query.from)
            to = new Date(req.query.to)
            to.setHours(23)
            to.setMinutes(59)
            to.setSeconds(59)
        }

        condition.create = {
            $gte: isodate(from),
            $lte: isodate(to)
        }

        let order = await OrderForPos.find(condition).select('orderID admin products sub_total_bill total_bill vat discount create').populate('admin', ['name']).limit(dataList).skip(offset).sort({
            "_id": -1
        })

        let allOrdersBill = await OrderForPos.find(condition).select('total_bill')

        let totalBill = 0 

        let totalBillOfOrders = allOrdersBill.map(billInfo=>{
            totalBill += billInfo.total_bill
        })

        await Promise.all(totalBillOfOrders)

        let totalOrderNo = await OrderForPos.find(condition).countDocuments()
        let loadMore = (offset + order.length) >= totalOrderNo ? false : true


        res.status(200).json({
            data: order,
            totalSell: totalOrderNo,
            totalBill: totalBill,
            loadMore: loadMore
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/order
// @description Get all the orders
// @access Private
router.get('/dashboard/exchange/list/:pageNo', [adminAuth], async (req, res) => {

    try {

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'dashboard')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let branch = req.query.branch

        let condition = {
            branch
        }

        let currentDate = new Date()

        let todayDate = currentDate.getUTCFullYear()+"-"+(currentDate.getUTCMonth()+1)+"-"+currentDate.getUTCDate()

        let from = new Date(todayDate)
        let to = new Date(todayDate)

        if(config.get('shopTimeZone').type=='+'){
            to.setHours(currentDate.getUTCHours()+config.get('shopTimeZone').difference.hours)
            to.setMinutes(currentDate.getUTCMinutes()+config.get('shopTimeZone').difference.munites)
            to.setSeconds(currentDate.getUTCSeconds()+config.get('shopTimeZone').difference.second)
        }else{
            to.setHours(currentDate.getUTCHours()-config.get('shopTimeZone').difference.hours)
            to.setMinutes(currentDate.getUTCMinutes()-config.get('shopTimeZone').difference.munites)
            to.setSeconds(currentDate.getUTCSeconds()-config.get('shopTimeZone').difference.second)
        }

        if(from > to){
            from.setDate(from.getDate()-1) 
        }
        


        if(req.query.from && req.query.to) {
            from = new Date(req.query.from)
            to = new Date(req.query.to)
            to.setHours(23)
            to.setMinutes(59)
            to.setSeconds(59)
        }

        condition.create = {
            $gte: isodate(from),
            $lte: isodate(to)
        }

        let order = await OrderExchange.find(condition).select('serialNo admin products exchangedBy exchange_amount sub_total_bill total_bill vat discount create').populate('admin', ['name']).limit(dataList).skip(offset).sort({
            "_id": -1
        })

        let allOrdersBill = await OrderExchange.find(condition).select('total_bill exchange_amount')

        let totalBill = 0 

        let totalBillOfOrders = allOrdersBill.map(billInfo=>{
            totalBill += (billInfo.total_bill - billInfo.exchange_amount)
        })

        await Promise.all(totalBillOfOrders)

        let totalOrderNo = await OrderExchange.find(condition).countDocuments()
        let loadMore = (offset + order.length) >= totalOrderNo ? false : true

        res.status(200).json({
            data: order,
            totalSell: totalOrderNo,
            totalBill: totalBill,
            loadMore: loadMore
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/order
// @description Get all the orders
// @access Private
router.get('/dashboard/refund/list/:pageNo', [adminAuth], async (req, res) => {

    try {

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'dashboard')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let branch = req.query.branch

        let condition = {
            branch
        }

        let currentDate = new Date()

        let todayDate = currentDate.getUTCFullYear()+"-"+(currentDate.getUTCMonth()+1)+"-"+currentDate.getUTCDate()

        let from = new Date(todayDate)
        let to = new Date(todayDate)

        if(config.get('shopTimeZone').type=='+'){
            to.setHours(currentDate.getUTCHours()+config.get('shopTimeZone').difference.hours)
            to.setMinutes(currentDate.getUTCMinutes()+config.get('shopTimeZone').difference.munites)
            to.setSeconds(currentDate.getUTCSeconds()+config.get('shopTimeZone').difference.second)
        }else{
            to.setHours(currentDate.getUTCHours()-config.get('shopTimeZone').difference.hours)
            to.setMinutes(currentDate.getUTCMinutes()-config.get('shopTimeZone').difference.munites)
            to.setSeconds(currentDate.getUTCSeconds()-config.get('shopTimeZone').difference.second)
        }

        if(from > to){
            from.setDate(from.getDate()-1) 
        }
        


        if(req.query.from && req.query.to) {
            from = new Date(req.query.from)
            to = new Date(req.query.to)
            to.setHours(23)
            to.setMinutes(59)
            to.setSeconds(59)
        }

        condition.create = {
            $gte: isodate(from),
            $lte: isodate(to)
        }

        let order = await OrderRefund.find(condition).select('serialNo admin products sub_total_bill total_bill vat discount create').populate('admin', ['name']).limit(dataList).skip(offset).sort({
            "_id": -1
        })

        let allOrdersBill = await OrderRefund.find(condition).select('total_bill')

        let totalBill = 0 

        let totalBillOfOrders = allOrdersBill.map(billInfo=>{
            totalBill += billInfo.total_bill
        })

        await Promise.all(totalBillOfOrders)

        let totalOrderNo = await OrderRefund.find(condition).countDocuments()
        let loadMore = (offset + order.length) >= totalOrderNo ? false : true


        res.status(200).json({
            data: order,
            totalSell: totalOrderNo,
            totalBill: totalBill,
            loadMore: loadMore
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/view/:id', [adminAuth], async (req, res) => {
    try {
        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let order = await OrderForPos.findOne({
            _id: req.params.id,
            branch: req.query.branch
        })

        let exchange = await PosOrderExchange.find({
            posOrder: req.params.id
        }).select('exchangedBy')

        let refund = await PosOrderRefund.find({
            posOrder: req.params.id
        }).select('products')

        res.status(200).json({
            data: order,
            exchange,
            refund
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/exchanges/list/:pageNo', [adminAuth], async (req, res) => {

    try {

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let branch = req.query.branch

        let condition = {
            branch
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'order_phone') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else if (columnName == 'order_status') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else {
                condition = {
                    [columnName]: parseInt(text),
                    branch
                }
            }

        }

        let order = await PosOrderExchange.find(condition).populate('posOrder', ['orderID']).populate('posExchange', ['serialNo']).populate('branch', ['name']).limit(dataList).skip(offset).sort({
            "_id": -1
        })


        res.status(200).json({
            data: order
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/exchanges/view/:id', [adminAuth], async (req, res) => {
    try {
        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let order = await PosOrderExchange.findOne({
            _id: req.params.id,
            branch: req.query.branch
        }).populate('baseOrderDetails').populate('posExchange')

        let exchange = await PosOrderExchange.find({
            posExchange: req.params.id
        }).select('exchangedBy')

        let refund = await PosOrderRefund.find({
            posExchange: req.params.id
        }).select('products')

        res.status(200).json({
            data: order,
            exchange,
            refund
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


router.get('/refunds/list/:pageNo', [adminAuth], async (req, res) => {

    try {

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let branch = req.query.branch

        let condition = {
            branch
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'order_phone') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else if (columnName == 'order_status') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else {
                condition = {
                    [columnName]: parseInt(text),
                    branch
                }
            }

        }

        let order = await PosOrderRefund.find(condition).populate('posOrder', ['orderID']).populate('posExchange', ['serialNo']).populate('branch', ['name']).limit(dataList).skip(offset).sort({
            "_id": -1
        })


        res.status(200).json({
            data: order
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router