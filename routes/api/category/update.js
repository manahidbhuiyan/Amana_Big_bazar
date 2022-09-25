const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');
var webp = require('webp-converter');
const auth = require('../../../middleware/admin/auth');
const Category = require('../../../models/Category');
const Product = require('../../../models/Product');

const {
    getAdminRoleChecking,
    upload,
    removeNotvalidateFile,
    removeUploadedImageFile
} = require('../../../lib/helpers');


// @route PUT api/category
// @description Update single category
// @access Private
router.put('/', [auth,
    upload.fields([{
        name: 'icon',
        maxCount: 1
    }, {
        name: 'cover',
        maxCount: 1
    }])
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {
        const {
            category,
            name,
            branch,
            vat,
            nbr_sd_code,
            nbr_vat_code
        } = req.body

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
        if (!category) {
            return res.status(400).send({
                errors: [{
                    msg: 'Category id required.'
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
            name,
            _id: {
                $ne: category
            }
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
            if (uploadedFileDetails.mimetype === 'image/png' || uploadedFileDetails.mimetype === 'image/jpeg' || uploadedFileDetails.mimetype === 'image/webp') {
                const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
                if (filesize < 1) {
                    try {
                        let path = uploadedFileDetails.path.replace('public\\', '/')
                        cover = path.replace(/\\/g, "/")

                        // let fileSavedPath =  uploadedFileDetailsIcon.path.substr(0, uploadedFileDetailsIcon.path.lastIndexOf(".")) + ".webp"

                        // webp.cwebp(uploadedFileDetails.path, fileSavedPath, "-q 80", async function(status,error)
                        // {
                        //     //if conversion successful status will be '100'
                        //     //if conversion fails status will be '101'
                        //     removeUploadedImageFile(uploadedFileDetails.path)
                        //     if(status==100){
                        //         let path = fileSavedPath.replace('public\\', '/')
                        //         cover = path.replace(/\\/g, "/")

                        //         let categoryCoverData = await Category.findById(category)
                        //         categoryCoverData.cover = cover
                        //         await categoryCoverData.save()

                        //     }else{
                        //         return res.status(400).json({
                        //             msg: 'Image uploaded filed. Please check your console.'
                        //         })
                        //     }
                        // });

                    } catch (error) {
                        return res.status(500).send('Server error')
                    }
                } else {
                    validationMessage = 'File should not be more than 1 MB.'
                    removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
                }
            } else {
                validationMessage = 'Only png, jpg and webp files are allowed.'
                removeNotvalidateFile(res, uploadedFileDetails, validationMessage)
            }
        }

        if (iconImage !== undefined) {
            const uploadedFileDetailsIcon = iconImage[0]
            if (uploadedFileDetailsIcon.mimetype === 'image/png' || uploadedFileDetailsIcon.mimetype === 'image/jpeg' || uploadedFileDetails.mimetype === 'image/webp') {
                const filesize = parseFloat(uploadedFileDetailsIcon.size) / (1024 * 1024)
                if (filesize < 1) {
                    try {
                        let pathIcon = uploadedFileDetailsIcon.path.replace('public\\', '/')
                        icon = pathIcon.replace(/\\/g, "/")

                        // let fileSavedPathIcon =  uploadedFileDetailsIcon.path.substr(0, uploadedFileDetailsIcon.path.lastIndexOf(".")) + ".webp"

                        // webp.cwebp(uploadedFileDetailsIcon.path, fileSavedPathIcon, "-q 80", async function(status,error)
                        // {
                        //     //if conversion successful status will be '100'
                        //     //if conversion fails status will be '101'
                        //     removeUploadedImageFile(uploadedFileDetailsIcon.path)
                        //     if(status==100){
                        //         let pathIcon = fileSavedPathIcon.replace('public\\', '/')
                        //         icon = pathIcon.replace(/\\/g, "/")

                        //         let categoryIconData = await Category.findById(category)
                        //         categoryIconData.icon = icon
                        //         await categoryIconData.save()

                        //     }else{
                        //         return res.status(400).json({
                        //             msg: 'Image uploaded filed. Please check your console.'
                        //         })
                        //     }
                        // });

                    } catch (error) {
                        return res.status(500).send('Server error')
                    }
                } else {
                    validationMessage = 'File should not be more than 1 MB.'
                    removeNotvalidateFile(res, uploadedFileDetailsIcon, validationMessage)
                }
            } else {
                validationMessage = 'Only png, jpg and webp files are allowed.'
                removeNotvalidateFile(res, uploadedFileDetailsIcon, validationMessage)
            }
        }

        setTimeout(async function () {
            let slug = slugify(name)
            let categoryData = await Category.findById(category)

            categoryData.slug = slug.toLowerCase().trim()
            categoryData.name = name.toLowerCase().trim()
            if (cover) {
                categoryData.cover = cover.replace('public', '')
            }
            if (icon) {
                categoryData.icon = icon.replace('public', '')
            }
            categoryData.vat = vat
            categoryData.nbr_sd_code = nbr_sd_code.toLowerCase().trim(),
            categoryData.nbr_vat_code = nbr_vat_code.toLowerCase().trim(),
            categoryData.branch = branch
            categoryData.update = Date.now()

            await categoryData.save()

            // await Product.updateMany({
            //     "category": category
            // }, {
            //     "vat": vat
            // })

            res.status(200).json({
                msg: 'Category information updated successfully',
                data: categoryData
            });
        }, 1000);


    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid category'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router