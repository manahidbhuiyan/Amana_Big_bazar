const express = require('express');
const router = express.Router();

var webp=require('webp-converter');

const auth = require('../../../middleware/admin/auth');
const UploadImage = require('../../../models/UploadImage');

const { upload, removeNotvalidateFile, removeUploadedImageFile, getAdminRoleChecking } = require('../../../lib/helpers');

// @route POST api/upload/image/create
// @description upload image
// @access Private - admin access
router.post('/image/create', [auth, upload.single('file')], async (req, res) => {
    let name = req.body.name

    if (!name) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Name shopuld not be empty.'
                }
            ]
        })
    }


    const adminRoles = await getAdminRoleChecking(req.admin.id, 'image upload')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Account is not authorized for property'
                }
            ]
        })
    }

    let validationMessage = '';
    const uploadedFileDetails = req.file
    if (uploadedFileDetails.mimetype === 'image/png' || uploadedFileDetails.mimetype === 'image/jpeg') {
      const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
      if (filesize < 1) {
        try {

            // let fileSavedPath =  uploadedFileDetails.path.substr(0, uploadedFileDetails.path.lastIndexOf(".")) + ".webp"
            
            let path = uploadedFileDetails.path.replace('public\\', '/')
            let url = path.replace(/\\/g, "/")
            let uploadImage = new UploadImage({
            name,
            url:url.replace('public', '')
            })
            await uploadImage.save()
            
            return res.status(200).json({
            msg: 'Image uploaded successfully',
            data: uploadImage
            })
            // webp.cwebp(uploadedFileDetails.path, fileSavedPath, "-q 80", async function(status,error)
            // {
            //     //if conversion successful status will be '100'
            //     //if conversion fails status will be '101'
            //     removeUploadedImageFile(uploadedFileDetails.path)
            //     if(status==100){
            //           let path = fileSavedPath.replace('public\\', '/')
            //           let url = path.replace(/\\/g, "/")
            //           let uploadImage = new UploadImage({
            //             name,
            //             url
            //           })
            //           await uploadImage.save()
            //           return res.status(200).json({
            //             msg: 'Image uploaded successfully',
            //             data: uploadImage
            //           })
            //     }else{
            //         console.log(error)
            //         return res.status(400).json({
            //             msg: 'Image uploaded filed. Please check your console.'
            //         })
            //     }
            // });
        
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
  })


// @route GET api/upload/image/remove/:removeID
// @description remove image
// @access Private - admin access
router.get('/image/remove/:removeID', [auth], async (req, res) => {
   
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'image upload')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Account is not authorized for property'
                }
            ]
        })
    }

    try {
        let uploadImage = await UploadImage.findById(req.params.removeID)

        if(uploadImage.length == 0){
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Image is invalid'
                    }
                ]
            }) 
        }

        let imagePath = 'public/'+uploadImage.url

        removeUploadedImageFile(imagePath)

        await uploadImage.remove()

        return res.status(200).json({
            msg: 'Image removed successfully'
        })
        
    } catch (error) {
        console.error(error.message)
        return res.status(500).send('Server error')
    }
})  

// @route GET api/upload/images/:pageNo
// @description remove image
// @access Private - admin access
router.get('/images/:pageNo', [auth], async (req, res) => {
   
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'image upload')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Account is not authorized for property'
                }
            ]
        })
    }

    try {
        let dataList = 15
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}
        
        if(req.query.type !== undefined)
        {
            let columnName = req.query.type
            let text = req.query.text
            
            if(columnName == 'name'){
                condition = { [columnName]: { $regex: text, $options: "i" }}
            }
            
        }

        let uploadImage = await UploadImage.find(condition).limit(dataList).skip(offset)
        res.status(200).json({
            data: uploadImage
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
})  

module.exports = router