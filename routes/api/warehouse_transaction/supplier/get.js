const express = require('express');
const router = express.Router();

var isodate = require("isodate");

const auth = require('../../../../middleware/admin/auth');
const RequisitionToSupplier = require('../../../../models/Tracking/WarehouseTransaction/RequisitionToSupplier');
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
                products: requisitionInfo.products,
                serialNo: requisitionInfo.serialNo,
                supplier: requisitionInfo.supplier,
                totalAmount: requisitionInfo.totalAmount,
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



module.exports = router