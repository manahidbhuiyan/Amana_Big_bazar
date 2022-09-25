const express = require('express');
const router = express.Router();

const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const GeneralJournalDetails = require('../../../../models/Accounts/GeneralJournalDetails');
const SubCategory = require('../../../../models/Accounts/Chart/SubCategory');
const ReconcileGeneralJournalDetails = require('../../../../models/Accounts/ReconcileGeneralJournalDetails');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route PUT api/accounts/generaljournal
// @description Update single generaljournal
// @access Private
router.put('/', [auth,
    [
        check('generaljournal', 'general journal is required').not().isEmpty(),
        check('type', 'type is required').not().isEmpty(),
        check('group', 'credit group is required').not().isEmpty(),
        check('subgroup', 'credit subgroup is required').not().isEmpty(),
        check('category', 'credit category is required').not().isEmpty(),
        //check('subcategory', 'credit subcategory is required').not().isEmpty(),
        // check('slip', 'credit slip no is required').not().isEmpty(),
        // check('record_date', 'record date required').not().isEmpty(),
        check('voucher', 'voucher is required').not().isEmpty(),
        // check('cost_center', 'cost center is required').not().isEmpty(),
        check('currency', 'currency is required').not().isEmpty(),
        check('amount', 'amount is required').not().isEmpty(),
        check('narration', 'narration is required').not().isEmpty(),
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

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
        
        const { generaljournal, type, group, subgroup, category, subcategory, slip, record_date, voucher, cost_center, currency, amount, narration, pay_with_requisition_no, pay_with_receiving_no, pay_to_supplier, de_pay_to_supplier, supplier, de_supplier } = req.body
        
        let generalJournalInfo = await GeneralJournalDetails.findById(generaljournal)
        let serialNo = 100

        const lastSerialInfo = await ReconcileGeneralJournalDetails.findOne().sort({create: -1})

        if(lastSerialInfo){
            serialNo = lastSerialInfo.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }    

        let reconcileInfo = {
            serialNo,
            "isCredit.previous": generalJournalInfo.isCredit,
            "group.previous": generalJournalInfo.group,
            "subgroup.previous": generalJournalInfo.subgroup,
            "category.previous": generalJournalInfo.category,
            "subcategory.previous": generalJournalInfo.subcategory,
            "slip.previous": generalJournalInfo.slip,
            "record_date.previous": generalJournalInfo.record_date,
            "voucher.previous": generalJournalInfo.voucher,
            "cost_center.previous": generalJournalInfo.cost_center,
            "currency.previous": generalJournalInfo.currency,
            "amount.previous": generalJournalInfo.amount,
            "narration.previous": generalJournalInfo.narration,
            "isCredit.current": type,
            "group.current": group,
            "subgroup.current": subgroup,
            "category.current": category,
            "subcategory.current": subcategory,
            "slip.current": slip,
            "record_date.current": record_date,
            "voucher.current": voucher,
            "cost_center.current": cost_center,
            "currency.current": currency,
            "amount.current": amount,
            "narration.current": narration,
            isUpdated: true,
            create: generalJournalInfo.create,
            admin: req.admin.id,
            general_journal_id: generalJournalInfo.general_journal,
            general_journal_details_id: generalJournalInfo._id,
            pay_to_supplier: {},
            pay_with_requisition_no: {},
            pay_with_receiving_no: {},
            supplier: {}
        }

        if(pay_to_supplier || generalJournalInfo.pay_to_supplier){
            reconcileInfo.pay_to_supplier.previous = generalJournalInfo.pay_to_supplier
            reconcileInfo.pay_to_supplier.current = pay_to_supplier
            reconcileInfo.supplier.previous = generalJournalInfo.supplier
            reconcileInfo.supplier.current = supplier
        }

        if(pay_with_requisition_no || generalJournalInfo.pay_with_requisition_no){
            reconcileInfo.pay_with_requisition_no.previous = generalJournalInfo.pay_with_requisition_no
            reconcileInfo.pay_with_requisition_no.current = pay_with_requisition_no
        }

        if(pay_with_receiving_no || generalJournalInfo.pay_with_receiving_no){
            reconcileInfo.pay_with_receiving_no.previous = generalJournalInfo.pay_with_receiving_no
            reconcileInfo.pay_with_receiving_no.current = pay_with_receiving_no
        }

        const reconcileGeneralBookInfo = new ReconcileGeneralJournalDetails(reconcileInfo)

        await reconcileGeneralBookInfo.save()
        
        generalJournalInfo.isCredit = type
        generalJournalInfo.group = group
        generalJournalInfo.subgroup = subgroup
        generalJournalInfo.category = category
        generalJournalInfo.subcategory = subcategory
        generalJournalInfo.slip = slip

        generalJournalInfo.record_date = record_date
        generalJournalInfo.voucher = voucher
        generalJournalInfo.cost_center = cost_center
        generalJournalInfo.currency = currency
        generalJournalInfo.amount = amount
        generalJournalInfo.narration = narration

        if(pay_to_supplier){
            generalJournalInfo.pay_to_supplier = pay_to_supplier
            generalJournalInfo.supplier = supplier
        }

        if(de_pay_to_supplier){
            generalJournalInfo.de_pay_to_supplier = de_pay_to_supplier
            generalJournalInfo.de_supplier = de_supplier
        }

        if(pay_with_requisition_no){
            generalJournalInfo.pay_with_requisition_no = pay_with_requisition_no
        }

        if(pay_with_receiving_no){
            generalJournalInfo.pay_with_receiving_no = pay_with_receiving_no
        }

        generalJournalInfo.admin = req.admin.id
        generalJournalInfo.update = Date.now()
     
        await generalJournalInfo.save() 

        res.status(200).json({
            msg: 'generaljournal information updated successfully',
            data: generalJournalInfo,
            reconcile: reconcileInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid generaljournal'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router