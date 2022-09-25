const getSearch = require('./get')

// Load Config 
const config = require('config')

const request = require('request')

const Notification = require('../../../../models/Notification');
const sendEmail = require('../../../../lib/email/sendEmailModule')

const searchNotificationData = async (branchID, orderID) => {
    try {
        let condition = {}

        let columnName = "branch"
        let text = branchID

        condition = {
            [columnName]: {
                $in: text
            }
        }

        condition.notificationType = {
            $in: ['ecommerce order']
        }

        condition.status = true

        let condition_email = condition;
        condition_email.type = "email"

        let notification_emails = await Notification.find(condition_email).populate({
            path: 'branch',
            select: 'name'
        })

        let condition_phone = condition;
        condition_phone.type = "phone"

        let notification_phone = await Notification.find(condition_phone).populate({
            path: 'branch',
            select: 'name'
        })

        if(notification_phone.length>0){
            const branchNameInfo = notification_phone[0].branch.filter((value) => value.id == branchID)[0].name;

            notification_emails.map(value => {
                const templateDetails = {
                    folder: "order",
                    filename: "index.ejs",
                    data: {
                        host: config.get('hostname'),
                        adminLink: '/login',
                        companyname: config.get('basicEmailInfo').companyName,
                        supportEmail: config.get('basicEmailInfo').supportEmail,
                        branchName: branchNameInfo,
                        orderID: orderID,
                        button: {
                            text: 'See Details'
                        }
                    }
                }

                const emailOptions = {
                    from: config.get('basicEmailInfo').fromEmail,
                    to: value.email,
                    subject: 'Order Notification(' + orderID + ')'
                }

                sendEmail(templateDetails, null, null, emailOptions)
            });

            notification_phone.map(value => {
                // Send Verification Code Message to phone 
                let msgText = "In " + config.get('basicEmailInfo').companyName + " website you have a new order for branch " + branchNameInfo + " and order id is " + orderID + ". Login to admin panel to see details."
    
                request.post({
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    url: config.get('smsinbd').requestURL,
                    form: {
                        api_key: config.get('smsinbd').api_key,
                        type: 'text',
                        contacts: "88" + value.phone,
                        msg: msgText,
                        senderid: config.get('smsinbd').senderid,
                        method: 'api'
                    }
                }, async (error, response, body) => {
                    if (JSON.parse(body).status.toLowerCase() == "success") {
                        console.log("Message sent.")
                    } else {
                        console.log("Message not sent.")
                    }
                });
            })
        }

    } catch (err) {
        console.error(err);
    }
}


module.exports = {
    getSearch,
    searchNotificationData
}