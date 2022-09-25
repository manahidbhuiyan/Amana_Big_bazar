const express = require('express');
const router = express.Router();

var isodate = require("isodate");

const auth = require('../../../../middleware/admin/auth');
const RequisitionToSupplier = require('../../../../models/Tracking/WarehouseSupply/ReturnSupplierWise');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route GET api/supplier
// @description Get all the subcategories
// @access Private
router.get('/return/:pageNo', auth, async (req, res) => {
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'supply')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to supply'
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

        let supplierRequisitionData = await RequisitionToSupplier.find(condition).populate('supplier', '_id name').populate('branch', 'name').sort({create:'desc'}).limit(dataList).skip(offset)

        console.log(supplierRequisitionData)
        let totalProductNumber = await RequisitionToSupplier.find(condition).countDocuments();

        let loadMore = (offset + supplierRequisitionData.length) >= totalProductNumber ? false : true

        res.status(200).json({
            data: supplierRequisitionData.sort(function(a,b){return b.serialNo - a.serialNo}),
            total: totalProductNumber,
            loadMore: loadMore
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});



module.exports = router