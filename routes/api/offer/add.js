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

// @route POST api/offer
// @description create an offer for ecommerce slider
// @access Private - admin access
router.post('/', [auth, upload.single('file')], async (req, res) => {
    const uploadedFileDetails = req.file
    
    let validationMessage = '';

    if (uploadedFileDetails == undefined) {
        return res.status(400).send({
            errors: [{
                msg: 'Cover image is required.'
            }]
        })
    }

    const { title, caption, link, branch } = req.body

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

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'offer')

    if (!adminRoles) {
        removeUploadedImageFile(res, uploadedFileDetails, validationMessage)
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized for offer'
            }]
        })
    }



    if (uploadedFileDetails.mimetype === 'image/png' || uploadedFileDetails.mimetype === 'image/jpeg') {
        const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
        if (filesize < 1) {
            try {
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

                let path = uploadedFileDetails.path.replace('public\\', '/')
                let url = path.replace(/\\/g, "/")

                let productOfferSlider = new Offer({
                    title,
                    caption,
                    photo: url.replace('public', ''),
                    link,
                    branch
                })

                await productOfferSlider.save()

                return res.status(200).json({
                    msg: 'offer is added successfully',
                    data: productOfferSlider
                })


            } catch (error) {
                console.error(error.message)
                return res.status(500).send('Server error')
            }
        } else {
            validationMessage = 'file should not be more than 1 MB.'
            removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
            return res.status(400).send({
                errors: [{
                    msg: validationMessage
                }]
            })
        }
    } else {
        validationMessage = 'only png and jpg files are allowed.'
        removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
        return res.status(400).send({
            errors: [{
                msg: validationMessage
            }]
        })
    }
})

module.exports = router