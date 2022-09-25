const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const GeneralJournalDetails = require('../../../../models/Accounts/GeneralJournalDetails');
const ReconcileGeneralJournalDetails = require('../../../../models/Accounts/ReconcileGeneralJournalDetails');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route DELETE api/accounts/generaljournal
// @description Remove Specific generaljournal
// @access Private
router.delete('/:generaljournalID', auth, async (req, res) => {
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

        // See if generaljournal exsist
        let generaljournal = await GeneralJournalDetails.findById(req.params.generaljournalID)

        if(!generaljournal){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid generaljournal remove request'
                  }
                ]
              })
        }

        let serialNo = 100

            const lastSerialInfo = await ReconcileGeneralJournalDetails.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }

        let reconcileInfo = {
            serialNo,
            "isCredit.previous": generaljournal.isCredit,
            "group.previous": generaljournal.group,
            "subgroup.previous": generaljournal.subgroup,
            "category.previous": generaljournal.category,
            "subcategory.previous": generaljournal.subcategory,
            "slip.previous": generaljournal.slip,
            "record_date.previous": generaljournal.record_date,
            "voucher.previous": generaljournal.voucher,
            "cost_center.previous": generaljournal.cost_center,
            "currency.previous": generaljournal.currency,
            "amount.previous": generaljournal.amount,
            "narration.previous": generaljournal.narration,
            isDeleted: true,
            create: generaljournal.create,
            admin: req.admin.id,
            general_journal_id: generaljournal.general_journal
        }

        const reconcileGeneralBookInfo = new ReconcileGeneralJournalDetails(reconcileInfo)

        await reconcileGeneralBookInfo.save()

        await generaljournal.remove()

        res.status(200).json({
            msg: 'general journal removed successfully',
            reconcile: reconcileInfo
        });
    } catch (err) {
      if (err.kind === 'ObjectId') {
          return res.status(400).json({
              msg: 'general journal not found'
          });
      }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router