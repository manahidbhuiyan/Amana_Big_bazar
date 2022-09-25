var mongoConnection = require('../../../../config/connectMongo')
mongoConnection()
const User = require('../../../../models/User');

process.on('message', async () => {
    let onlineUserInfo = []
    let serial = 0

    let users = await User.find().select('name email phone contact')

    if (users.length > 0) {
        let parentArray = await users.map(async userInfo => {
            serial += 1

            onlineUserInfo.push({
                serial: serial,
                name: userInfo.name,
                email: userInfo.email,
                phone: userInfo.phone.number,
                address: userInfo.contact.address,
                district: userInfo.contact.district,
                division: userInfo.contact.division,
                thana: userInfo.contact.thana
            })
        })

        await Promise.all(parentArray)
    }

    process.send({
        onlineUserInfo
    });

});