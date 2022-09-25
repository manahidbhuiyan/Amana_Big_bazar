const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const PosUser = require('../../../models/PosUser');
const Admin = require('../../../models/admin/Admin');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route GET api/cart
// @description Get products according user cart
// @access Private
router.get('/:phone', auth, async (req, res) => {
    try {
        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        // See if user exsist
        let posUser = await PosUser.findOne({
            phone: req.params.phone
        })

        if (!posUser) {
            posUser = await PosUser.findOne({
                clientID: req.params.phone
            })
        }

        return res.status(200).json({
            auth: true,
            data: posUser
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router