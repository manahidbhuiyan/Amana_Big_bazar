const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const Product = require('../../../models/Product');
const PosUser = require('../../../models/PosUser');
const Admin = require('../../../models/admin/Admin');

const {
    getAdminRoleChecking,
    generateNextID
} = require('../../../lib/helpers');

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.post('/', [auth,
    [
        check('clientID', 'Client id is required').not().isEmpty(),
        check('name', 'Name is required').not().isEmpty(),
        check('phone', 'Phone is required').not().isEmpty(),
        check('address', 'Address is required').not().isEmpty(),
        check('branch', 'Branch is required').not().isEmpty()
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        let clientID = req.body.clientID;

        // See if admin exsist
        let posuserIDCheck = await PosUser.findOne({
            clientID
        })

        if (posuserIDCheck) {
            return res.status(400).send({
                errors: [
                    {
                    msg: 'Client id have to be unique'
                    }
                ]
            })
        }

        //clientID = generateNextID(await PosUser.countDocuments(), 10000000)

        

        const {
            name,
            phone,
            branch,
            email,
            address,
            notes
        } = req.body

        // See if pos user exsist
        let posuser = await PosUser.findOne({
            phone
        })

        if (posuser) {
            return res.status(400).send({
                auth: false,
                errors: [{
                    msg: 'POS user already exists'
                }]
            })
        }

        // See if pos user exsist
        let posuserID = await PosUser.findOne({
            clientID
        })

        if (posuserID) {
            return res.status(400).send({
                auth: false,
                errors: [{
                    msg: 'POS user id already exists. Try again!'
                }]
            })
        }

        const posUser = new PosUser({
            clientID: clientID,
            name: name.toLowerCase().trim(),
            branch,
            phone: phone,
            email: email.toLowerCase().trim(),
            address: address.toLowerCase().trim(),
            notes: notes.toLowerCase().trim()
        })

        await posUser.save();

        return res.status(200).json({
            auth: true,
            msg: "New pos client added",
            data: posUser
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.put('/point-update', [auth,
    [
        check('id', 'Client id required').not().isEmpty(),
        check('points', 'Point is required').not().isEmpty()
    ]
], async (req, res) => {
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        const posUser = await PosUser.findById(req.body.id)

        posUser.points = req.body.points
        await posUser.save();

        return res.status(200).json({
            auth: true,
            msg: "Points updated successfully",
            data: posUser
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router