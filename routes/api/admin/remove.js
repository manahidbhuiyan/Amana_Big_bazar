const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const Admin = require('../../../models/admin/Admin');

// @route DELETE api/admin/:adminID
// @description Delete Admin Account
// @access Private
router.delete('/:adminID', auth, async (req, res) => {
    
    try {
        let adminData = await Admin.findById(req.params.adminID)
    
        await adminData.remove()

        res.status(200).json({
            type: 'success',
            msg: 'Admin removed successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid admin'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router