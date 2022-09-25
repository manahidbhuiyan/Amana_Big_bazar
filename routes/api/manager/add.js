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

// @route POST api/brand
// @description Add new brand
// @access Private
router.post('/', [auth,
    [
        check('branch', 'Branch is required').not().isEmpty(),
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Email id required').not().isEmpty(),
        check('phone', 'Phone no. is required').not().isEmpty()
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos manager')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized for pos manager'
                }]
            })
        }

        const {
            branch,
            name,
            email,
            phone,
            active
        } = req.body

        const branchManagerInfo = await BranchManager.findOne({
            $or: [{ name: name }, { email: email }, { phone: phone }]
        })

        if (branchManagerInfo) {
            return res.status(400).send({
                errors: [{
                    msg: 'This branch manager info already exists'
                }]
            })
        }

        let serialNo = 1000

        const lastSerialInfo = await BranchManager.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }

        const addBranchManagerInfo = new BranchManager({
            serialNo,
            branch,
            name,
            email,
            phone,
            active
        })

        await addBranchManagerInfo.save()
        res.status(200).json({
            msg: 'New branch manager added successfully',
            data: addBranchManagerInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router