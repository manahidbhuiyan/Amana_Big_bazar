const express = require('express');
const router = express.Router();

const auth = require('../../../../../middleware/admin/auth');
const Currency = require('../../../../../models/Accounts/Settings/Currency');
const GeneralJournalDetails = require('../../../../../models/Accounts/GeneralJournalDetails');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route DELETE api/accounts/settings/currency
// @description Remove Specific currency
// @access Private
router.delete('/:currencyID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings currency')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }

        let currencyName = await GeneralJournalDetails.find({
            currency: req.params.currencyID
        })

        if (currencyName.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'currency is already used in general book'
                    }
                ]
            })
        }

        // See if currency exsist
        let currency = await Currency.findById(req.params.currencyID)

        if(!currency){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid currency remove request'
                  }
                ]
              })
        }

        await currency.remove()

        res.status(200).json({
            msg: 'currency removed successfully'
        });
    } catch (err) {
      if (err.kind === 'ObjectId') {
          return res.status(400).json({
              msg: 'currency not found'
          });
      }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router