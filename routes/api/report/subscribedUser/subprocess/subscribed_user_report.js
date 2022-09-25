var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()

const Subscription = require('../../../../../models/Subscription');

process.on('message', async (msg) => {
  const { subscriberCondition } = msg

  let subscribedUserInfo = []
  let serial = 0

  let subscriber = await Subscription.find(subscriberCondition).select('email')


  let parentArray = await subscriber.map(async subscriberInfo => {
    if (subscriberInfo.email != '') {
      serial += 1
    }
    subscribedUserInfo.push({
      serial: serial,
      email: subscriberInfo.email,
    })
  })

  await Promise.all(parentArray)

  process.send({
    subscribedUserInfo
  });

});