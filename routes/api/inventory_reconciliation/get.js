const express = require('express');
const router = express.Router();

var isodate = require("isodate");

const auth = require('../../../middleware/admin/auth');
const InventoryProductReconciliation = require('../../../models/InventoryReconciliation');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route GET api/inventory/reconciliation/:pageNo
// @description Get all the inventory product reconciliaton
// @access Private
router.get('/:pageNo', auth, async (req, res) => {
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'product')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Account is not authorized to product reconciliation'
                }
            ]
        })
    }

    try {
        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}

        if (req.query.branch !== undefined) {
            condition.branch = req.query.branch
        }


        let from = new Date(req.query.from)
        let to = new Date(req.query.to)

        to.setHours(23)
        to.setMinutes(59)
        to.setSeconds(59)

        condition.create = {
            $gte: isodate(from),
            $lte: isodate(to)
        }

        let productDisposalData = await InventoryProductReconciliation.find(condition).sort({ create: 'desc' }).limit(dataList).skip(offset)

        let totalProductNumber = await InventoryProductReconciliation.find(condition).countDocuments();
        let loadMore = (offset + productDisposalData.length) >= totalProductNumber ? false : true

        res.status(200).json({
            data: productDisposalData,
            total: totalProductNumber,
            loadMore: loadMore
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router