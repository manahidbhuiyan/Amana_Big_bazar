const express = require('express');
const router = express.Router();

const auth = require('../../../../../middleware/admin/auth');
const Category = require('../../../../../models/Accounts/Chart/Category');
const SubCategory = require('../../../../../models/Accounts/Chart/SubCategory');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route DELETE api/accounts/chart/category
// @description Remove Specific category
// @access Private
router.delete('/:categoryID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'chart of accounts category')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to chart of accounts'
                    }
                ]
            })
        }

        let subcategory = await SubCategory.find({
            category: {$in: req.params.categoryID}
        })

        if (subcategory.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Category is already used in subcategory'
                    }
                ]
            })
        }

        // See if category exsist
        let category = await Category.findById(req.params.categoryID)

        if(!category){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid category remove request'
                  }
                ]
              })
        }

        await category.remove()

        res.status(200).json({
            msg: 'category removed successfully'
        });
    } catch (err) {
      if (err.kind === 'ObjectId') {
          return res.status(400).json({
              msg: 'category not found'
          });
      }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router