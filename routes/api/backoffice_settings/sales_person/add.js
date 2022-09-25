const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const SalesPerson = require('../../../../models/SalesPerson');
const Admin = require('../../../../models/admin/Admin');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.post('/', [auth,
    [
        check('branch', 'Branch is required').not().isEmpty(),
        check('name', 'Name is required').not().isEmpty(),
        check('phone', 'Phone is required').not().isEmpty()
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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'backoffice settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to backoffice settings'
                }]
            })
        }

        let serialNo =  Number(10000)

        const lastSerialInfo = await SalesPerson.findOne({}).sort({create: -1})

        if(lastSerialInfo){
            serialNo = lastSerialInfo.personID + 1
        }else{
            serialNo = serialNo + 1
        } 

        const {
            branch,
            name,
            phone,
            email,
            address,
            notes
        } = req.body

        // See if pos user exsist
        let salesPerson = await SalesPerson.findOne({
            phone
        })

        if (salesPerson) {
            return res.status(400).send({
                auth: false,
                errors: [{
                    msg: 'your provided phone no should be unique'
                }]
            })
        }

        const salesPersonInfo = new SalesPerson({
            personID: serialNo,
            branch: branch,
            name: name,
            phone: phone,
            email: email,
            address: address,
            notes: notes
        })

        await salesPersonInfo.save();

        return res.status(200).json({
            auth: true,
            msg: "New sales person been set successfully",
            data: salesPersonInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


module.exports = router