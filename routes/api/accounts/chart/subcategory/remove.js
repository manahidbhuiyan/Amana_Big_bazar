const express = require('express');
const router = express.Router();

const auth = require('../../../../../middleware/admin/auth');
const SubCategory = require('../../../../../models/Accounts/Chart/SubCategory');
const GeneralJournalDetails = require('../../../../../models/Accounts/GeneralJournalDetails');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route DELETE api/accounts/chart/subcategory
// @description Remove Specific subcategory
// @access Private
router.delete('/:subcategoryID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'chart of accounts subcategory')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to chart of accounts'
                    }
                ]
            })
        }

        let subcategoryName = await GeneralJournalDetails.find({
            subcategory: req.params.subcategoryID
        })

        if (subcategoryName.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'subcategory is already used in general book'
                    }
                ]
            })
        }

        // See if subcategory exsist
        let subcategory = await SubCategory.findById(req.params.subcategoryID)

        if(!subcategory){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid subcategory remove request'
                  }
                ]
              })
        }

        await subcategory.remove()

        res.status(200).json({
            msg: 'subcategory removed successfully'
        });
    } catch (err) {
      if (err.kind === 'ObjectId') {
          return res.status(400).json({
              msg: 'subcategory not found'
          });
      }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router