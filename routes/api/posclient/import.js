const express = require('express');
const router = express.Router();
const fs = require('fs')
const xlsx = require('node-xlsx');
const {ObjectId} = require('mongodb');

// Load Middleware
const auth = require('../../../middleware/admin/auth')

const PosUser = require('../../../models/PosUser');

const {
  upload,
  removeUploadedFile
} = require('../../../lib/data/import')


// @route api/category/data/import
// @description Category data import
// @access Private
router.post('/data/import/excel', [auth, upload.single('file')], async (req, res) => {
  let validationMessage = '';
  const uploadedFileDetails = req.file
  if (uploadedFileDetails.mimetype === 'application/octet-stream' || uploadedFileDetails.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || uploadedFileDetails.mimetype === 'application/vnd.ms-excel') {
    const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
    if (filesize < 10) {
      try {
        let path = appRoot + '/' + uploadedFileDetails.path.replace('\\', '/')
        // Parse a file
        var obj = xlsx.parse(fs.readFileSync(path.replace(/\\/g, "/")));

        let importDataObject = []
        if (obj[0].data.length > 0) {
          let allImportedData = obj[0].data.filter((data) => data.length != 0)
          let allClientsArray = allImportedData.map(async (data) => {
            let clientID = data[0]
            let name = data[1]!=''?data[1].toLowerCase().trim():''
            let phone = data[2]
            let points = data[3]
            let address = typeof(data[4])!='undefined'?data[4].toLowerCase().trim():''
            let email = typeof(data[5])!='undefined'?data[5].toLowerCase().trim():''
            let notes = typeof(data[6])!='undefined'?data[6].toLowerCase().trim():''
            let branch = typeof(data[7])!='undefined'?data[7].trim():''

            let posClientData = {
              clientID: clientID,
              name: unescape(name),
              phone: phone,
              points: points,
              address: address,
              email: email,
              notes: notes,
              branch: ObjectId(branch)
            }

            let posUserInfo = await PosUser.findOne({
              $or: [{clientID}, {phone}]
            })

            if(posUserInfo){
              posUserInfo.points += points
              // posUserInfo.branch = ObjectId(branch)
              await posUserInfo.save()
              // console.log(posClientData)
            }else{
              importDataObject.push(posClientData)
              let posUser = new PosUser(posClientData)
              await posUser.save();
            }
          })

          await Promise.all(allClientsArray)

          removeUploadedFile(res, uploadedFileDetails, null)

          return res.status(200).json({
            msg: 'POS user '+ importDataObject.length +' imported successfully',
            data: importDataObject
          })
        } else {
          removeUploadedFile(res, uploadedFileDetails, "Your excel file is empty")
        }
      } catch (error) {
        console.error(error.message)
        return res.status(500).send('Server error')
      }
    } else {
      validationMessage = 'File should not be more than 10 MB.'
      removeUploadedFile(res, uploadedFileDetails, validationMessage)
    }
  } else {
    validationMessage = 'Only xlsx and xls files are allowed.'
    removeUploadedFile(res, uploadedFileDetails, validationMessage)
  }
})

module.exports = router