const express = require('express');
const router = express.Router();

const config = require('config')

var isodate = require("isodate");

const auth = require('../../../../middleware/admin/auth');
const ReceiveFromSupplier = require('../../../../models/Tracking/WarehouseTransaction/ReceiveFromSupplier');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route GET api/supplier
// @description Get all the subcategories
// @access Private
router.get('/:pageNo', auth, async (req, res) => {
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse transaction')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to warehouse transaction'
                    }
                ]
            })
        }

    try {
        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}

        
        if(req.query.serialNo !== undefined)
        {
            let serialNo = req.query.serialNo
            condition = { serialNo: serialNo } 
        }else{
            let supplier = req.query.supplier
            let from = new Date(req.query.from)
            let to = new Date(req.query.to)
            to.setHours(23)
            to.setMinutes(59)
            to.setSeconds(59)

            condition.supplier = supplier
            condition.create = {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }

        let receivingFromSupplierData = await ReceiveFromSupplier.find(condition).populate('supplier', '_id name').sort({create:'desc'}).limit(dataList).skip(offset)
    

        let totalProductNumber = await ReceiveFromSupplier.find(condition).countDocuments();

        let loadMore = (offset + receivingFromSupplierData.length) >= totalProductNumber ? false : true

        res.status(200).json({
            data: receivingFromSupplierData,
            total: totalProductNumber,
            loadMore: loadMore
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/supplier
// @description Get all the subcategories
// @access Private
router.get('/dashboard/:pageNo', auth, async (req, res) => {
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'dashboard')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to dashboard'
                    }
                ]
            })
        }

    try {
        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {
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

        if(from == to){
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

        let receivingFromSupplierData = await ReceiveFromSupplier.find(condition).populate('supplier', '_id name').populate('admin', '_id name').sort({create:'desc'}).limit(dataList).skip(offset)
    

        let totalProductNumber = await ReceiveFromSupplier.find(condition).countDocuments();

        let totalBill = 0 

        let totalBillOfReceiving = receivingFromSupplierData.map(receivingInfo=>{
            totalBill += receivingInfo.totalAmount
        })

        await Promise.all(totalBillOfReceiving)

        let loadMore = (offset + receivingFromSupplierData.length) >= totalProductNumber ? false : true

        res.status(200).json({
            data: receivingFromSupplierData,
            total: totalProductNumber,
            loadMore: loadMore,
            totalBill: totalBill
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});



module.exports = router