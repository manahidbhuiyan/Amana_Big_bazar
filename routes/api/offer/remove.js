const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const Offer = require('../../../models/Offer');

const {
    removeUploadedImageFile,
    getAdminRoleChecking
} = require('../../../lib/helpers');


// @route GET api/offer/:removeID?branch=
// @description remove offer slider from home page
// @access Private - admin access
router.delete('/:offer_id', [auth], async (req, res) => {

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'offer')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized for offer'
            }]
        })
    }

    try {
        let offerInfo = await Offer.findById(req.params.offer_id)

        if (offerInfo == null) {
            return res.status(400).send({
                errors: [{
                    msg: 'invalid offer id for remove the offer'
                }]
            })
        }

        removeUploadedImageFile('public/' + offerInfo.photo)

        await offerInfo.remove()

        return res.status(200).json({
            msg: 'Offer removed successfully'
        })

    } catch (error) {
        console.error(error.message)
        return res.status(500).send('Server error')
    }
})


module.exports = router