const express = require('express')
const router = express.Router()

const {
    check,
    validationResult
} = require('express-validator');

const Subscription = require('../../../models/Subscription');

router.post('/', [ 
    [
        check('email', 'Email is required').not().isEmpty()
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const { email, timestamp } = req.body

   

        let emailAlreadyExist = await Subscription.findOne({
            email: email
        })
    
        if (emailAlreadyExist) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'This Email is already exist'
                }
              ],
              success: false
            })
        }


        const subscriptionDateObject = new Date(timestamp)
        const subscriptionHour = subscriptionDateObject.getHours()



        let currentTimestamp = new Date().getTime()
        let currentDateObject = new Date(currentTimestamp)
        let currentHour = currentDateObject.getHours()



        if (currentHour !== subscriptionHour) {
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Subscription Hour Must be Current Hour'
                  }
                ],
                success: false
              })
        }

        const addSubscriptionInfo = new Subscription({
            email
        })

        await addSubscriptionInfo.save()
        res.status(200).json({
            msg: 'Subscripton Successfully Finished'
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router