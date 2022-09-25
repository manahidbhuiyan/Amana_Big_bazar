const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const BranchManager = require('../../../models/manager/Manager');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route PUT api/brand
// @description Update single brand
// @access Private
router.post('/auth', [auth,
    [
        check('managerID', 'Manager id is required').not().isEmpty(),
        check('branch', 'Branch is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    // const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos manager')

    // if (!adminRoles) {
    //     return res.status(400).send({
    //         errors: [{
    //             msg: 'Account is not authorized for pos manager'
    //         }]
    //     })
    // }

    try {
        const { managerID, branch } = req.body

        

        let condition = {
            _id: managerID,
            branch:{
                 $in: branch
            },
            active: true
        }

        let branchManagerInfo = await BranchManager.find(condition)
        console.log(branchManagerInfo)
        if(branchManagerInfo.length>0){
            res.status(200).json({
                data: true
            });
        }else{
            res.status(200).json({
                data: false
            });
        }

    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid branch manager'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router