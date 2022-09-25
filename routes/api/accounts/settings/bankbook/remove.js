const express = require('express');
const router = express.Router();

const auth = require('../../../../../middleware/admin/auth');
const BankBook = require('../../../../../models/Accounts/Settings/BankBook');
const GeneralJournalDetails = require('../../../../../models/Accounts/GeneralJournalDetails');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route DELETE api/accounts/settings/bankbook
// @description Remove Specific bankbook
// @access Private
router.delete('/:bankbookID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings bankbook')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }

        let bankbookName = await GeneralJournalDetails.find({
            bankbook: req.params.bankbookID
        })

        if (bankbookName.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'bankbook is already used in subcategory'
                    }
                ]
            })
        }

        // See if bankbook exsist
        let bankbook = await BankBook.findById(req.params.bankbookID)

        if(!bankbook){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid bankbook remove request'
                  }
                ]
              })
        }

        await bankbook.remove()

        res.status(200).json({
            msg: 'bankbook removed successfully'
        });
    } catch (err) {
      if (err.kind === 'ObjectId') {
          return res.status(400).json({
              msg: 'bankbook not found'
          });
      }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router