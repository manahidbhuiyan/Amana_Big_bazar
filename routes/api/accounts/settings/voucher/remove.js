const express = require('express');
const router = express.Router();

const auth = require('../../../../../middleware/admin/auth');
const Voucher = require('../../../../../models/Accounts/Settings/Voucher');
const GeneralJournalDetails = require('../../../../../models/Accounts/GeneralJournalDetails');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route DELETE api/accounts/settings/voucher
// @description Remove Specific voucher
// @access Private
router.delete('/:voucherID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings voucher')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }

        let vouchername = await GeneralJournalDetails.find({
            voucher: req.params.voucherID
        })

        if (vouchername.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'voucher is already used in bank book'
                    }
                ]
            })
        }

        // See if voucher exsist
        let voucher = await Voucher.findById(req.params.voucherID)

        if(!voucher){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid voucher remove request'
                  }
                ]
              })
        }

        await voucher.remove()

        res.status(200).json({
            msg: 'voucher removed successfully'
        });
    } catch (err) {
      if (err.kind === 'ObjectId') {
          return res.status(400).json({
              msg: 'voucher not found'
          });
      }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router