const express = require('express');
const router = express.Router();

var webp=require('webp-converter');

const auth = require('../../../middleware/admin/auth');
const UploadImage = require('../../../models/UploadImage');
const ClientReview = require('../../../models/ClientReview');

const { upload, removeNotvalidateFile, removeUploadedImageFile, getAdminRoleChecking } = require('../../../lib/helpers');

// @route POST api/upload/image/create
// @description upload image
// @access Private - admin access
router.post('/create', [auth,upload.single('file')], async (req, res) => {
    let name = req.body.name
    let text = req.body.text
    let star = req.body.star
    
    const uploadedFileDetails = req.file

    if (!name) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Client Name not be empty.'
                }
            ]
        })
    }
    if (uploadedFileDetails == undefined) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Client photo is required.'
                }
            ]
        })
    }
    if (!text) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Client Review not be empty.'
                }
            ]
        })
    }


    const adminRoles = await getAdminRoleChecking(req.admin.id, 'client review')

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
    if (uploadedFileDetails.mimetype === 'image/png' || uploadedFileDetails.mimetype === 'image/jpeg') {
      const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
      if (filesize < 1) {
        try {

            // let fileSavedPath =  uploadedFileDetails.path.substr(0, uploadedFileDetails.path.lastIndexOf(".")) + ".webp"
            
            let path = uploadedFileDetails.path.replace('public\\', '/')
            let url = path.replace(/\\/g, "/")
            let clientreview = new ClientReview({
            name,
            text,
            star,
            photo:url.replace('public', '')
            })
            await clientreview.save()
            
            return res.status(200).json({
            msg: 'Client review add successfully',
            data: clientreview
            })
            // webp.cwebp(uploadedFileDetails.path, fileSavedPath, "-q 80", async function(status,error)
            // {
            //     //if conversion successful status will be '100'
            //     //if conversion fails status will be '101'
            //     removeUploadedImageFile(uploadedFileDetails.path)
            //     if(status==100){
            //           let path = fileSavedPath.replace('public\\', '/')
            //           let url = path.replace(/\\/g, "/")
            //           let ClientReview = new ClientReview({
            //             name,
            //             url
            //           })
            //           await ClientReview.save()
            //           return res.status(200).json({
            //             msg: 'Image uploaded successfully',
            //             data: ClientReview
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
router.delete('/remove/:removeID', [auth], async (req, res) => {
   
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'client review')

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
        let clientreview = await ClientReview.findById(req.params.removeID)

        if(clientreview.length == 0){
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Image is invalid'
                    }
                ]
            }) 
        }

        let imagePath = 'public/'+clientreview.photo

        removeUploadedImageFile(imagePath)

        await clientreview.remove()

        return res.status(200).json({
            msg: 'Client review removed successfully'
        })
        
    } catch (error) {
        console.error(error.message)
        return res.status(500).send('Server error')
    }
})  

// @route GET api/upload/images/:pageNo
// @description remove image
// @access Private - admin access
router.get('/lists/:pageNo', async (req, res) => {
   
    // const adminRoles = await getAdminRoleChecking(req.admin.id, 'Client Review')

    // if (!adminRoles) {
    //     return res.status(400).send({
    //         errors: [
    //             {
    //                 msg: 'Account is not authorized for property'
    //             }
    //         ]
    //     })
    // }

    try {
        let dataList = 10
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

        let clientreview = await ClientReview.find(condition).limit(dataList).skip(offset)
        //console.log(clientreview)
        res.status(200).json({
            data: clientreview
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
}) 
router.get('/items', async (req, res) => {

    try {
        let clientreview = await ClientReview.find()
        res.status(200).json({
            data: clientreview
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
})  


module.exports = router