
var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
const POSUser = require('../../../../../models/PosUser');
const OrderForPos = require('../../../../../models/OrderForPos');
process.on('message', async (msg) => {
  const { branch_id, type, condition } = msg

  let userWiseOrderInfo = []
  
  let posUser = await POSUser.find({
    branch: branch_id,
  }).select('clientID name phone address points')

  let posOrders = await OrderForPos.find(condition).select('customer')

  let mainArray = await posUser.map(async posUserInfo => {
    let userIndex = posOrders.findIndex(posOrderInfo => posOrderInfo.customer.name == posUserInfo.name)
      if(userIndex != -1){
        userWiseOrderInfo.push({
          code: posUserInfo.clientID,
          name: posUserInfo.name,
          phone: posUserInfo.phone,
          bonus_point: (type == 'pdf') ? posUserInfo.points.toFixed(2) : posUserInfo.points,
          address: posUserInfo.address
        })
      }
  })

  await Promise.all(mainArray)

  process.send({
    userWiseOrderInfo
  });
});