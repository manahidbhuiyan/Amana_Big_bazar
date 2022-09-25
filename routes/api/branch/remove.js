const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const Branch = require('../../../models/Branch');
const Category = require('../../../models/Category');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route DELETE api/cart
// @description Remove Specific Branch
// @access Private
router.delete('/:branchID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'branch')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to branch'
                }]
            })
        }

        let categories = await Category.find({
            branch: {
                $in: req.params.branchID
            }
        })

        if (categories.length > 0) {
            return res.status(400).send({
                errors: [{
                    msg: 'Branch is already used in category.'
                }]
            })
        }

        // See if user exsist
        let branch = await Branch.findById(req.params.branchID)

        if (!branch) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid branch remove request'
                }]
            })
        }

        await branch.remove()

        res.status(200).json({
            msg: 'Branch is removed successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'Branch not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router