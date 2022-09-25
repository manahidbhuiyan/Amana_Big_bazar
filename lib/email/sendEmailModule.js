const sgMail = require('@sendgrid/mail');
const ejs = require('ejs');
const fs = require('fs');
const config = require('config')
const path = require('path')
sgMail.setApiKey(config.get('mailConfig').api_key);

var readHTMLFile = function (path, callback) {
    fs.readFile(path, {
        encoding: 'utf-8'
    }, function (err, html) {
        if (err) {
            throw err;
            callback(err);
        } else {
            callback(null, html);
        }
    });
};

const emailTemplateInitialize = (templateLocation, templateData) => {
    return new Promise((resolve, reject) => {
        readHTMLFile(templateLocation, function (err, html) {
            var template = ejs.compile(html)
            var replacements = templateData

            var htmlToSend = template(replacements);

            if (err) {
                console.log(err)
                reject(err)
            } else {
                resolve(htmlToSend)
            }
        })
    })
}


const sendMail = (emailOptions) => {
    var mailOptions = emailOptions

    const msg = mailOptions;
      //ES6
      sgMail
        .send(msg)
        .then(() => {}, error => {
          console.error(error);
      
          if (error.response) {
            console.error(error.response.body)
          }
        });
      //ES8
      (async () => {
        try {
          await sgMail.send(msg);
        } catch (error) {
          console.error(error);
      
          if (error.response) {
            console.error(error.response.body)
          }
        }
      })();
}

// Demo Data parameter for mail sending 
// const templateDetails = {
//     folder: "reset",
//     filename: "index.ejs",
//     data:{
//         username:"Test"
//     }
// }

// const emailOptions = {
//     from: 'youremail@gmail.com',
//     to: 'livehostingbd@gmail.com',
//     subject: 'Sending Email using Node.js'
// }

// const attachment = [{
//     filename: "Images.jpg",
//     path: "http://cloudinary-res.cloudinary.com/image/upload/c_limit,h_540,w_770/f_auto,fl_lossy,q_auto/rzxcje2xocuicsxjevlviw.jpg"
// }] 

// const message = "This is simple text"

const sendEmail = (templateDetails = null, message = null, attachedData = null, emailOptions) => {
    if (attachedData != null) {
        emailOptions.attachments = attachedData
    }

    if (templateDetails != null) {
        let emailTemplatePromise = emailTemplateInitialize(path.join(__dirname, '..', '..', 'emails', templateDetails.folder, templateDetails.filename), templateDetails.data);
        emailTemplatePromise.then((result) => {
            emailOptions.html = result
            sendMail(emailOptions)
        })
    } else {
        emailOptions.text = message
        sendMail(emailOptions)
    }

}

// sendEmail(null, message, attachment, emailOptions)

module.exports = sendEmail