const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const Offer = require('../../../models/Offer');

const {
    upload,
    removeNotvalidateFile,
    removeUploadedImageFile,
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route PUT api/offer
// @description Update single offer
// @access Private
router.put('/', [auth, upload.single('file')], async (req, res) => {
    const uploadedFileDetails = req.file
    let validationMessage = '';

    const { offer_id, title, caption, link, branch, isActive } = req.body

    if (!offer_id) {
        if (uploadedFileDetails != undefined) {
            removeUploadedImageFile(uploadedFileDetails.path)
        } 
        return res.status(400).send({
            errors: [{
                msg: 'offer id is required'
            }]
        })
    }

    if (!title) {
        if (uploadedFileDetails != undefined) {
            removeUploadedImageFile(uploadedFileDetails.path)
        } 
        return res.status(400).send({
            errors: [{
                msg: 'title is required'
            }]
        })
    }

    if (!branch) {
        if (uploadedFileDetails != undefined) {
            removeUploadedImageFile(uploadedFileDetails.path)
        } 
        return res.status(400).send({
            errors: [{
                msg: 'branch is required'
            }]
        })
    }

    if (!link) {
        if (uploadedFileDetails != undefined) {
            removeUploadedImageFile(uploadedFileDetails.path)
        } 
        return res.status(400).send({
            errors: [{
                msg: 'link is required'
            }]
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'offer')

    if (!adminRoles) {
        removeUploadedImageFile(uploadedFileDetails.path)
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized for offer'
            }]
        })
    }

    let offer = await Offer.findById(offer_id)

    if(offer.branch != branch){
        removeUploadedImageFile(uploadedFileDetails.path)
        return res.status(400).send({
            errors: [{
                msg: 'your branch id is not valid to update this offer'
            }]
        })
    }

    if (uploadedFileDetails !== undefined) {
        removeUploadedImageFile('public/'+offer.photo)
        if (uploadedFileDetails.mimetype === 'image/png' || uploadedFileDetails.mimetype === 'image/jpeg') {
            const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
            if (filesize < 1) {
                try {

                    let path = uploadedFileDetails.path.replace('public\\', '/')
                    let url = path.replace(/\\/g, "/")

                    offer.photo = url.replace('public', '')

                } catch (error) {
                    console.error(error.message)
                    return res.status(500).send('Server error')
                }
            } else {
                validationMessage = 'File should not be more than 1 MB.'
                removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
            }
        } else {
            validationMessage = 'Only png and jpg files are allowed.'
            removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
        }

    }

    offer.title = title
    offer.caption = caption
    offer.link = link
    offer.isActive = isActive
    await offer.save()

    return res.status(200).json({
        msg: 'Offer is updated successfully',
        data: offer
    })

})

module.exports = router