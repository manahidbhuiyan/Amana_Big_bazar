const fs = require('fs')
const config = require('config')
const multer = require('multer')

// Generate Next Order ID According to Order Collection 
const generateNextCode = (totalOrdersPlaced) => {
    let nextOrderNumber = config.get('generatedIDFrom')
    
    return totalOrdersPlaced+nextOrderNumber+1
}


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, config.get('importFileLocation'));
    },
    filename: (req, file, cb) => {
        console.log(file.mimetype)
      var filetype = '';
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        filetype = 'xlsx';
      }
      if (file.mimetype === 'application/vnd.ms-excel') {
        filetype = 'xls';
      }
      cb(null, 'category-' + Date.now() + generateNextCode(Date.now()) + '.' + filetype);
    }
  });
  
  // Upload the photos method
  const upload = multer({
    storage: storage
  });
  
  //Remove uploaded files if not satisfy the validation
  const removeUploadedFile = (res, uploadedFileDetails, validationMessage) => {
      fs.unlink(uploadedFileDetails.path, (err) => {
        if (err) {
          console.error(err)
          return
        } else {
          if(validationMessage!=null){
            return res.json({
              auth: false,
              errors: [{
                msg: validationMessage
              }]
            })
          }
          return 
        }
      });
    }

module.exports = {
    upload,
    removeUploadedFile
}

