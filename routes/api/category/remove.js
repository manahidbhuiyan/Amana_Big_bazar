const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const Category = require('../../../models/Category');
const Subcategory = require('../../../models/SubCategory');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route DELETE api/category
// @description Remove Specific category
// @access Private
router.delete('/:categoryID', auth, async (req, res) => {
    try {

      const adminRoles = await getAdminRoleChecking(req.admin.id, 'category')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to category'
                    }
                ]
            })
        }

        let subcategories = await Subcategory.find({
            category: {$in: req.params.categoryID}
        })

        if (subcategories.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Category is already used in subcategory'
                    }
                ]
            })
        }

        // See if user exsist
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
            msg: 'Category removed successfully'
        });
    } catch (err) {
      if (err.kind === 'ObjectId') {
          return res.status(400).json({
              msg: 'Category not found'
          });
      }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router