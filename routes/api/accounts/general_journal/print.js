const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');
const jwt = require('jsonwebtoken');
const excel = require('node-excel-export');
const auth = require('../../../../middleware/admin/auth');
const GeneralJournalDetails = require('../../../../models/Accounts/GeneralJournalDetails');
const config = require('config')


const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');


// @route GET api/api/accounts/generaljournal/print
// @description print general journal details informantion
// @access Private
router.post('/print', [
    auth,
    [
        check('item', 'General Journal information is required').not().isEmpty(),
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to Accounts'
                    }
                ]
            })
        }

        let {
            item
        } = req.body

        console.log(item)

        let journalDetails = await GeneralJournalDetails.find({general_journal : item})
                            .populate('cost_center', 'name')
                            .populate('subcategory', 'name')
                            .populate('supplier', 'name')
                            .populate('voucher', 'name')
                            .populate('general_journal', 'serialNo')

        console.log(journalDetails)
        let allJournals = []
        let totalDebit = 0
        let totalCredit = 0
        let voucherNo = ''
        let recordDateTime = ''
        let cost_center = ''

        journalDetails.map((journalInfo, index)=>{
            if(index == 0){
                let date = new Date(journalInfo.record_date) 
                let hours = date.getHours()
                let minutes = date.getMinutes()
                let ampm = hours >= 12 ? 'pm' : 'am'
                hours = hours % 12
                hours = hours ? hours : 12 // the hour '0' should be '12'
                minutes = minutes < 10 ? '0' + minutes : minutes
                recordDateTime = ("0" + date.getDate()).slice(-2) + '-' + (date.getMonth() + 1) + '-' + date.getUTCFullYear() + '   ' + hours + ':' + minutes + ' ' + ampm
                voucherNo = journalInfo.general_journal.serialNo
                cost_center = journalInfo.cost_center.name

                allJournals.push({
                    subcategory: journalInfo.subcategory ? journalInfo.subcategory.name : journalInfo.supplier.name,
                    naration: journalInfo.narration,
                    voucher: journalInfo.voucher.name,
                    debitAmount: !journalInfo.isCredit ? journalInfo.amount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : '',
                    creditAmount: journalInfo.isCredit ? journalInfo.amount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : ''
                })
            }else{
                allJournals.push({
                    subcategory: journalInfo.subcategory ? journalInfo.subcategory.name : journalInfo.supplier.name,
                    naration: '',
                    voucher: '',
                    debitAmount: !journalInfo.isCredit ? journalInfo.amount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : '',
                    creditAmount: journalInfo.isCredit ? journalInfo.amount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : ''
                })
            }
            if(journalInfo.isCredit){
                totalCredit += journalInfo.amount
            }else{
                totalDebit += journalInfo.amount
            }
            
        })

        let allDataInfo = {}
        allDataInfo.journalDate = recordDateTime
        allDataInfo.voucherNo = voucherNo
        allDataInfo.totalDebit = totalDebit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
        allDataInfo.totalCredit = totalCredit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
        allDataInfo.branchName = cost_center == null ? config.get('warehouse').name : cost_center
        allDataInfo.journalDetails = allJournals
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let today = new Date();
        let hours = today.getHours();
        let minutes = today.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let createTime = hours + ':' + minutes + ' ' + ampm;
        let branch = ''
        if(journalDetails[0].cost_center._id != null){
             branch = await Branch.findById(journalDetails[0].cost_center._id).select('_id name address serialNo phone');
        }
        
        allDataInfo.today = ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
        allDataInfo.createTime = createTime,
        allDataInfo.company_name = config.get('company').full_name,
        allDataInfo.company_logo = config.get('company').company_logo
        if(journalDetails[0].cost_center._id != null){
            allDataInfo.branch_phone = branch.phone,
            allDataInfo.branch_id = branch.serialNo,
            allDataInfo.branch_name = branch.name.trim(),
            allDataInfo.branch_address = branch.address.trim()
       }else{
            allDataInfo.branch_phone = config.get('warehouse').phone,
            allDataInfo.branch_id = config.get('warehouse').code,
            allDataInfo.branch_name = config.get('warehouse').name,
            allDataInfo.branch_address = config.get('warehouse').address
       }

        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..','reports', 'accounts', 'print_general_journal_details.html'), 'utf8');

        var options = {
            format: "A4",
            orientation: "portrait",
            border: "5mm"
        }

        var document = {
            html: html,
            data: allDataInfo,
            path: "./public/reports/general_journal_report.pdf"
        };

        pdf.create(document, options)
            .then(data => {
                const file = data.filename;
                return res.status(200).json({
                    auth: true,
                    fileLink: '/reports/general_journal_report.pdf' 
                })
            })
            .catch(error => {
                console.error(error)
            });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router