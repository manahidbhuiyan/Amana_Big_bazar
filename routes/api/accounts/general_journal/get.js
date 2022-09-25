const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const GeneralJournalDetails = require('../../../../models/Accounts/GeneralJournalDetails');
const GeneralJournal = require('../../../../models/Accounts/GeneralJournal');
const BranchRequisition = require('../../../../models/Tracking/Transaction/RequisitionToSupplier');
const BranchReceiving = require('../../../../models/Tracking/Transaction/ReceiveFromSupplier');
const WarehouseRequisition = require('../../../../models/Tracking/WarehouseTransaction/RequisitionToSupplier');
const WarehouseReceiving = require('../../../../models/Tracking/WarehouseTransaction/ReceiveFromSupplier');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route GET api/accounts/generaljournal/:pageNo?type=1&slip=?&group=?&subgroup=?&category=?&subcategory=?&voucher=?&costcenter=?&currency=?
// @description Get all the generaljournal Details
// @access Private
router.get('/:pageNo', [auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts general book')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to general book'
                    }
                ]
            })
        }
        let dataList = 30
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}

        if (req.query.slip !== undefined) {
            condition.slip = {
                $regex: req.query.slip,
                $options: "i"
            }
        }
        if (req.query.serialNo !== undefined) {
            let journalInfo = await GeneralJournal.findOne({
                serialNo: req.query.serialNo
            }).select("_id")
           condition.general_journal = journalInfo._id
        }
        if (req.query.type !== undefined) {
            condition.isCredit = (req.query.type == 0 ? false : true)
        }

        if (req.query.group !== undefined) {
            condition.group = req.query.group
        }

        if (req.query.subgroup !== undefined) {
            condition.subgroup = req.query.subgroup
        }

        if (req.query.category !== undefined) {
            condition.category = req.query.category
        }

        if (req.query.subcategory !== undefined) {
            condition.subcategory = req.query.subcategory
        }

        if (req.query.voucher !== undefined) {
            condition.voucher = req.query.voucher
        }

        if (req.query.cost_center !== undefined) {
            condition.cost_center = req.query.cost_center
        }

        if (req.query.cost_center == 'null') {
            condition.cost_center = null
        }

        if (req.query.currency !== undefined) {
            condition.currency = req.query.currency
        }
        console.log(condition)
        let generaljournal = await GeneralJournalDetails.find(condition).populate('group', ['name']).populate('subgroup', ['name']).populate('category', ['name'])
        .populate('subcategory', ['name']).populate('de_group', ['name']).populate('de_subgroup', ['name']).populate('de_category', ['name']).populate('de_subcategory', ['name'])
        .populate('supplier', ['name']).populate('de_supplier', ['name']).populate('cost_center', ['name']).populate('voucher', ['name']).populate('currency', ['name conversion_rate'])
        .populate('general_journal', ['serialNo', 'is_updatable']).sort({record_date : -1}).limit(dataList).skip(offset)

        
        res.status(200).json({
            data: generaljournal
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/generaljournal/all/:serialNo
// @description Get all the generaljournal
// @access Private
router.get('/all/:serialNo', [auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts general book')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to general book'
                    }
                ]
            })
        }
        let serialNo = req.params.serialNo
        let condition = {}

        if (serialNo !== undefined) {
            condition.serialNo = serialNo
        }

        let generaljournal = await GeneralJournal.find(condition)
        
        res.status(200).json({
            data: generaljournal
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/generaljournal?type=1&supplier=?&pay_with_requisition_no=?&pay_with_receiving_no=?
// @description Get all the generaljournal
// @access Private
router.get('/', [auth], async (req, res) => {
    try {
        let condition = {
        }

        if (req.query.type !== undefined) {
            condition.isCredit = (req.query.type == 0 ? false : true)
        }

        if (req.query.supplier !== undefined) {
            condition.supplier = req.query.supplier
        }

        if(req.query.pay_with_requisition_no !== undefined){
            condition.pay_with_requisition_no = req.query.pay_with_requisition_no
        }

        if(req.query.pay_with_receiving_no !== undefined){
            condition.pay_with_receiving_no = req.query.pay_with_receiving_no
        }
        
        let generaljournal = await GeneralJournalDetails.find(condition).populate('group', ['name'])
        .populate('subgroup', ['name']).populate('category', ['name']).populate('subcategory', ['name']).populate('supplier', ['name'])
        .populate('cost_center', ['name']).populate('voucher', ['name']).populate('currency', ['name']).populate('general_journal', 'serialNo')
       
        res.status(200).json({
            data: generaljournal
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/generaljournal/search/supplier/requisition/:serialNo?branch=?
// @description Get all the supplier receiving
// @access Private
router.get('/search/supplier/requisition/:serialNo', [auth], async (req, res) => {
    try {
        const branch = req.query.branch
        const serialNo = req.params.serialNo
        
        if(typeof branch === undefined){
            return res.status(400).json({
                errors: [
                    {
                        msg: 'invalid request with out branch params'
                    }
                ]
            })
        }

        let condition = {
            serialNo
        }

        let receivingInfo = null

        if(branch===''){
            receivingInfo = await WarehouseRequisition.findOne(condition).populate('supplier', '_id name').populate('admin', '_id name')
        }else{
            receivingInfo = await BranchRequisition.findOne(condition).populate('supplier', '_id name').populate('admin', '_id name')
        }
        res.status(200).json({
            data: receivingInfo
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/generaljournal/search/supplier/receiving/:serialNo?branch=?
// @description Get all the supplier receiving
// @access Private
router.get('/search/supplier/receiving/:serialNo', [auth], async (req, res) => {
    try {
        const branch = req.query.branch
        const serialNo = req.params.serialNo
        
        if(typeof branch === undefined){
            return res.status(400).json({
                errors: [
                    {
                        msg: 'invalid request with out branch params'
                    }
                ]
            })
        }

        let condition = {
            serialNo
        }

        let receivingInfo = null

        if(branch===''){
            receivingInfo = await WarehouseReceiving.findOne(condition).populate('supplier', '_id name').populate('admin', '_id name').populate('requisitionID', ['serialNo'])
        }else{
            receivingInfo = await BranchReceiving.findOne(condition).populate('supplier', '_id name').populate('admin', '_id name').populate('requisitionID', ['serialNo'])
        }
        res.status(200).json({
            data: receivingInfo
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/accounts/generaljournal/data/:journalID
// @description Get single journal details
// @access Private
router.get('/data/:journalID', [auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts general book')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to general book'
                    }
                ]
            })
        }

        let journalInfo = await GeneralJournalDetails.find({ general_journal : req.params.journalID}).populate('group', ['name']).populate('subgroup', ['name']).populate('category', ['name']).populate('subcategory', ['name']).populate('cost_center', ['name']).populate('voucher', ['name']).populate('currency', ['name']).populate('supplier', ['name']).populate('general_journal', 'serialNo')

        res.status(200).json({
            data: journalInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid journal'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/generaljournal/data/details/:journalID
// @description Get single journal details debit or credit
// @access Private
router.get('/data/details/:journalID', [auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts general book')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to general book'
                    }
                ]
            })
        }

        let journalInfo = await GeneralJournalDetails.findOne({ _id : req.params.journalID}).populate('group', ['name']).populate('subgroup', ['name']).populate('category', ['name']).populate('subcategory', ['name']).populate('cost_center', ['name']).populate('voucher', ['name']).populate('currency', ['name']).populate('supplier', ['name']).populate('general_journal', 'serialNo')

        res.status(200).json({
            data: journalInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid journal'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});
module.exports = router