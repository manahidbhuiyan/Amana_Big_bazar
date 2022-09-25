const express = require('express');
const router = express.Router();

const config = require('config')
var isodate = require("isodate");

const auth = require('../../../../middleware/admin/auth');
const RequisitionToSupplier = require('../../../../models/Tracking/Transaction/RequisitionToSupplier');
const ReceiveFromSupplier = require('../../../../models/Tracking/Transaction/ReceiveFromSupplier');
const RequisitionWiseSupply = require('../../../../models/Tracking/WarehouseSupply/RequisitionWiseSupply');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route GET api/supplier
// @description Get all the subcategories
// @access Private
router.get('/:pageNo', auth, async (req, res) => {
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'transaction')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to transaction'
                    }
                ]
            })
        }

    try {
        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}

        if(req.query.branch !== undefined)
        {
            condition.branch = req.query.branch
        }

        
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

        let supplierRequisitionDataList = [] 

        let supplierRequisitionData = await RequisitionToSupplier.find(condition).populate('supplier', '_id name').sort({create:'desc'}).limit(dataList).skip(offset)
    
        let supplierRequisitionReceivingCheck = supplierRequisitionData.map(async (requisitionInfo, index)=>{
            let result = await ReceiveFromSupplier.find({requisitionID: requisitionInfo._id}).select("_id") 
            
            if(result.length>0){
               requisitionInfo.receivedStatus = true
            }else{
                requisitionInfo.receivedStatus = false
            }

            supplierRequisitionDataList.push({
                _id: requisitionInfo._id,
                admin: requisitionInfo.admin,
                branch: requisitionInfo.branch,
                products: requisitionInfo.products,
                serialNo: requisitionInfo.serialNo,
                supplier: requisitionInfo.supplier,
                totalAmount: requisitionInfo.totalAmount,
                toWarehouse: requisitionInfo.toWarehouse,
                totalQuantity: requisitionInfo.totalQuantity,
                receivedStatus: requisitionInfo.receivedStatus,
                create: requisitionInfo.create,
                update: requisitionInfo.update
            })
        })

        await Promise.all(supplierRequisitionReceivingCheck)

        let totalProductNumber = await RequisitionToSupplier.find(condition).countDocuments();

        let loadMore = (offset + supplierRequisitionData.length) >= totalProductNumber ? false : true

        res.status(200).json({
            data: supplierRequisitionDataList.sort(function(a,b){return b.serialNo - a.serialNo}),
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
router.get('/warehouse/:pageNo', auth, async (req, res) => {
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

        if(req.query.branch !== undefined)
        {
            condition.branch = req.query.branch
        }

        
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

        let supplierRequisitionDataList = [] 

        let supplierRequisitionData = await RequisitionToSupplier.find(condition).populate('supplier', '_id name').sort({create:'desc'}).limit(dataList).skip(offset)
    
        let supplierRequisitionReceivingCheck = supplierRequisitionData.map(async (requisitionInfo, index)=>{
            let result = await ReceiveFromSupplier.find({requisitionID: requisitionInfo._id}).select("_id") 
            
            if(result.length>0){
               requisitionInfo.receivedStatus = true
            }else{
                requisitionInfo.receivedStatus = false
            }

            supplierRequisitionDataList.push({
                _id: requisitionInfo._id,
                admin: requisitionInfo.admin,
                branch: requisitionInfo.branch,
                products: requisitionInfo.products,
                serialNo: requisitionInfo.serialNo,
                supplier: requisitionInfo.supplier,
                totalAmount: requisitionInfo.totalAmount,
                toWarehouse: requisitionInfo.toWarehouse,
                totalQuantity: requisitionInfo.totalQuantity,
                receivedStatus: requisitionInfo.receivedStatus,
                create: requisitionInfo.create,
                update: requisitionInfo.update
            })
        })

        await Promise.all(supplierRequisitionReceivingCheck)

        let totalProductNumber = await RequisitionToSupplier.find(condition).countDocuments();

        let loadMore = (offset + supplierRequisitionData.length) >= totalProductNumber ? false : true

        res.status(200).json({
            data: supplierRequisitionDataList.sort(function(a,b){return b.serialNo - a.serialNo}),
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
router.get('/to-warehouse/dashboard/:pageNo', auth, async (req, res) => {
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

        let condition = {}

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
        

        if(req.query.warehouse){
            condition.toWarehouse = req.query.warehouse
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

        if(req.query.branch){
            condition.branch = req.query.branch
        }

        if(req.query.supplier){
            condition.supplier = req.query.supplier
        }

        let supplierRequisitionDataList = []

        let requisitionToWarehouse = await RequisitionToSupplier.find(condition).populate('branch', '_id name').populate('supplier', '_id name').populate('admin', '_id name').sort({create:'desc'}).limit(dataList).skip(offset)

        let supplierRequisitionReceivingSupplyCheck = requisitionToWarehouse.map(async (requisitionInfo, index)=>{
            let result = await ReceiveFromSupplier.find({requisitionID: requisitionInfo._id, branch: requisitionInfo.branch, supplier: requisitionInfo.supplier})
            
            let supplyCheck = await RequisitionWiseSupply.find({requisitionNo: requisitionInfo.serialNo, supplier: requisitionInfo.supplier, branch: requisitionInfo.branch})
            
            if(result.length>0){
               requisitionInfo.receivedStatus = true
            }else{
                requisitionInfo.receivedStatus = false
            }

            if(supplyCheck.length>0){
                requisitionInfo.supplyStatus = true
             }else{
                 requisitionInfo.supplyStatus = false
             }

            supplierRequisitionDataList.push({
                ...requisitionInfo._doc,
                receivedStatus: requisitionInfo.receivedStatus,
                supplyStatus: requisitionInfo.supplyStatus,
            })
        })

        await Promise.all(supplierRequisitionReceivingSupplyCheck)

        let totalRequisitionNumber = await RequisitionToSupplier.find(condition).countDocuments();

        let totalBill = 0 

        let totalBillOfReceiving = requisitionToWarehouse.map(receivingInfo=>{
            totalBill += receivingInfo.totalAmount
        })

        await Promise.all(totalBillOfReceiving)

        let loadMore = (offset + requisitionToWarehouse.length) >= totalRequisitionNumber ? false : true

        res.status(200).json({
            data: supplierRequisitionDataList,
            total: totalRequisitionNumber,
            loadMore: loadMore,
            totalBill: totalBill
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router