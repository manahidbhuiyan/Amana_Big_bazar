const express = require('express');
const router = express.Router();
const multer = require('multer')
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

var webp = require('webp-converter');
const UploadImage = require('../../../models/UploadImage');
const auth = require('../../../middleware/admin/auth');
const Category = require('../../../models/Category');

const {
    getAdminRoleChecking,
    upload,
    removeNotvalidateFile,
    removeUploadedImageFile
} = require('../../../lib/helpers');

// @route POST api/category
// @description Add New category
// @access Private


router.post('/', [auth,
    upload.fields([{
        name: 'icon',
        maxCount: 1
    }, {
        name: 'cover',
        maxCount: 1
    }])
], async (req, res) => {
    try {
        const {
            name,
            branch,
            vat,
            nbr_sd_code,
            nbr_vat_code
        } = req.body

        let slug = slugify(name)
        if (!name) {
            return res.status(400).send({
                errors: [{
                    msg: 'Category is required.'
                }]
            })
        }
        if (!branch) {
            return res.status(400).send({
                errors: [{
                    msg: 'Branch is required.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'category')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to category'
                }]
            })
        }

        const categoryName = await Category.findOne({
            name
        })

        if (categoryName) {
            return res.status(400).send({
                errors: [{
                    msg: 'Category name already exists'
                }]
            })
        }

        let validationMessage = '';
        const iconImage = req.files.icon
        const coverImage = req.files.cover
        let icon = null
        let cover = null
        if (coverImage !== undefined) {
            const uploadedFileDetails = coverImage[0]
            if (uploadedFileDetails.mimetype === 'image/png' || uploadedFileDetails.mimetype === 'image/jpeg') {
                const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
                if (filesize < 1) {
                    try {
                        let path = uploadedFileDetails.path.replace('public\\', '/')
                        cover = path.replace(/\\/g, "/")

                        // let fileSavedPath =  uploadedFileDetails.path.substr(0, uploadedFileDetails.path.lastIndexOf(".")) + ".webp"

                        // webp.cwebp(uploadedFileDetails.path, fileSavedPath, "-q 80", async function(status,error)
                        // {
                        //     //if conversion successful status will be '100'
                        //     //if conversion fails status will be '101'
                        //     removeUploadedImageFile(uploadedFileDetails.path)
                        //     if(status==100){
                        //         let path = fileSavedPath.replace('public\\', '/')
                        //         cover = path.replace(/\\/g, "/")

                        //     }else{
                        //         return res.status(400).json({
                        //             msg: 'Image uploaded filed. Please check your console.'
                        //         })
                        //     }
                        // });

                    } catch (error) {
                        console.log(error)
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

        if (iconImage !== undefined) {
            const uploadedFileDetailsIcon = iconImage[0]
            if (uploadedFileDetailsIcon.mimetype === 'image/png' || uploadedFileDetailsIcon.mimetype === 'image/jpeg') {
                const filesize = parseFloat(uploadedFileDetailsIcon.size) / (1024 * 1024)
                if (filesize < 1) {
                    try {

                        let pathIcon = uploadedFileDetailsIcon.path.replace('public\\', '/')
                        icon = pathIcon.replace(/\\/g, "/")

                        //let fileSavedPathIcon =  uploadedFileDetailsIcon.path.substr(0, uploadedFileDetailsIcon.path.lastIndexOf(".")) + ".webp"

                        // webp.cwebp(uploadedFileDetailsIcon.path, fileSavedPathIcon, "-q 80", async function(status,error)
                        // {
                        //     //if conversion successful status will be '100'
                        //     //if conversion fails status will be '101'
                        //     removeUploadedImageFile(uploadedFileDetailsIcon.path)
                        //     if(status==100){
                        //         let pathIcon = fileSavedPathIcon.replace('public\\', '/')
                        //         icon = pathIcon.replace(/\\/g, "/")

                        //     }else{
                        //         return res.status(400).json({
                        //             msg: 'Image uploaded filed. Please check your console.'
                        //         })
                        //     }
                        // });

                    } catch (error) {
                        console.log(error)
                        return res.status(500).send('Server error')
                    }
                } else {
                    validationMessage = 'File should not be more than 1 MB.'
                    removeNotvalidateFile(res, uploadedFileDetailsIcon, validationMessage)
                }
            } else {
                validationMessage = 'Only png and jpg files are allowed.'
                removeNotvalidateFile(res, uploadedFileDetailsIcon, validationMessage)
            }
        }
        setTimeout(async function () {
            let serialNo = 10

            const lastSerialInfo = await Category.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }

            const addCategoryInfo = new Category({
                serialNo,
                branch,
                name: name.toLowerCase().trim(),
                vat,
                nbr_sd_code: nbr_sd_code.toLowerCase().trim(),
                nbr_vat_code: nbr_vat_code.toLowerCase().trim(),
                cover: cover.replace('public', ''),
                icon: icon.replace('public', ''),
                slug: slug.toLowerCase().trim()
            })

            await addCategoryInfo.save()
            res.status(200).json({
                msg: 'New category added successfully',
                data: addCategoryInfo
            })
        }, 1000);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router