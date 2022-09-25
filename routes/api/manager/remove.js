const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const BranchManager = require('../../../models/manager/Manager');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route DELETE api/brand
// @description Remove Specific brand
// @access Private
router.delete('/:branchManagerID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos manager')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized for pos manager'
                }]
            })
        }

        

        // See if user exsist
        let branchManager = await BranchManager.findById(req.params.branchManagerID)

        if(!branchManager){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid branch manager remove request'
                  }
                ]
              })
        }

        await branchManager.remove()

        res.status(200).json({
            msg: 'Branch manager removed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router