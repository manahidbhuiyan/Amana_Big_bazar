const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const GeneralJournal = require('../../../../models/Accounts/GeneralJournal');
const GeneralJournalDetails = require('../../../../models/Accounts/GeneralJournalDetails');
const SubCategory = require('../../../../models/Accounts/Chart/SubCategory');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route POST api/accounts/generaljournal
// @description Add new generaljournal
// @access Private
router.post('/', [auth, 
    [
        check('credit_balance', 'credit balance is required').not().isEmpty(),
        check('debit_balance', 'debit_balance is required').not().isEmpty(),
        check('closing_balance', 'closing balance is required').not().isEmpty(),
        check('journals', 'journals is required').not().isEmpty(),
        check('journals.*.type', 'type is required').not().isEmpty(),
        check('journals.*.group', 'accounts group is required').not().isEmpty(),
        check('journals.*.subgroup', 'accounts subgroup is required').not().isEmpty(),
        check('journals.*.category', 'accounts category is required').not().isEmpty(),
        // check('record_date', 'record date required').not().isEmpty(),
        check('journals.*.pay_to_supplier', 'pay to supplier is required').not().isEmpty(),
        check('journals.*.voucher', 'voucher is required').not().isEmpty(),
        //check('journals.*.cost_center', 'cost center is required').not().isEmpty(),
        check('journals.*.currency', 'currency is required').not().isEmpty(),
        check('journals.*.amount', 'amount is required').not().isEmpty(),
        check('journals.*.narration', 'narration is required').not().isEmpty(),
    ]
], async (req, res) => { 
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        let { credit_balance, debit_balance, closing_balance, journals } = req.body

        let serialNo = 100

        const lastSerialInfo = await GeneralJournal.findOne().sort({create: -1})

        if(lastSerialInfo){
            serialNo = lastSerialInfo.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }

        let generalJournalInfo = {
            serialNo,
            credit_balance,
            debit_balance,
            closing_balance
        }

        const generalJournalInfoData = new GeneralJournal(generalJournalInfo)

        let responseJournalInfo = await generalJournalInfoData.save()

        let journalsInfo = []

        for(let i = 0; i < journals.length; i++){
            let generalJournalInfoDetails = {
                isCredit: journals[i].type,
                group: journals[i].group,
                subgroup: journals[i].subgroup,
                category: journals[i].category,
                subcategory: journals[i].subcategory,
                slip: journals[i].slip,
                record_date: journals[i].record_date,
                voucher: journals[i].voucher,
                cost_center: journals[i].cost_center,
                currency: journals[i].currency,
                amount: journals[i].amount,
                narration: journals[i].narration,
                general_journal: responseJournalInfo._id,
                admin: req.admin.id
            }
    
            if(journals[i].pay_to_supplier){
                generalJournalInfoDetails.pay_to_supplier = journals[i].pay_to_supplier
                generalJournalInfoDetails.supplier = journals[i].supplier
            }
    
            if(journals[i].pay_with_requisition_no){
                generalJournalInfoDetails.pay_with_requisition_no = journals[i].pay_with_requisition_no
            }
    
            if(journals[i].pay_with_receiving_no){
                generalJournalInfoDetails.pay_with_receiving_no = journals[i].pay_with_receiving_no
            }
    
            let generalJournalInfoDetailsData = new GeneralJournalDetails(generalJournalInfoDetails)
    
            await generalJournalInfoDetailsData.save()

            journalsInfo.push(generalJournalInfoDetailsData)
        }

        res.status(200).json({
            msg: 'new general book info added successfully',
            data: responseJournalInfo,
            journals: journalsInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router