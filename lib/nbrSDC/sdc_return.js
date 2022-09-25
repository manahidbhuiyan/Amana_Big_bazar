var crypto = require('crypto');
const config = require('config');
var net = require('net');
var mongoConnection = require('../../config/connectMongo')
mongoConnection()
const Category = require('../../models/Category');

class Crypto {
  
   /**
   * key iv
   * @param  {String} algorithm `aes-128-ecb`
   * @param  {String} key  
   * @param  {String} iv initialization vector
   */

  constructor(algorithm, key, iv = '') {
    this.algorithm = algorithm;
    this.key = key;
    this.iv = iv;
  }

  /**
   *
   * @param  {String} message         
   * @param  {String} messageEncoding 
   * @param  {String} cipherEncoding  
   *
   * @return {String} encrypted      
   */
  encrypt(message, messageEncoding = 'utf8', cipherEncoding = 'base64') {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    cipher.setAutoPadding(true);

    let encrypted = cipher.update(message, messageEncoding, cipherEncoding);
    encrypted += cipher.final(cipherEncoding);

    return encrypted;
  }

  /**
   * @param  {String} encrypted       
   * @param  {String} cipherEncoding  
   * @param  {String} messageEncoding 
   *
   * @return {String} decrypted       
   */
  decrypt(encrypted, cipherEncoding = 'base64', messageEncoding = 'utf8') {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(encrypted, cipherEncoding, messageEncoding);
    decrypted += decipher.final(messageEncoding);

    return decrypted;
  }
};


var k = "123456";
var k1 = crypto.createHash('md5').update(k).digest("hex").toUpperCase()
var key = crypto.createHash('sha256').update(k1).digest("hex").toUpperCase()

const { v4: uuidv4 } = require('uuid');

var fullResponse = ""

const connectToSDCDevice = (deviceIP, key, sellData) => {
    return new Promise((resolve, reject)=>{
        var client = new net.Socket();

        client.connect(config.get('nbr_sdc_device').tcp, deviceIP, function() {
            let obj = new Crypto('aes-256-ecb', Buffer.from(key, 'hex'))
        
            let encryptData = obj.encrypt(JSON.stringify(sellData))
    
            encryptData = String(encryptData.length).padStart(6, "0") + encryptData

            console.log('Connected');

            client.write(encryptData);

            var is_kernel_buffer_full = client.write(encryptData);
            if(is_kernel_buffer_full){
              console.log('Data was flushed successfully from kernel buffer i.e written successfully!');
              client.on('data', function(data) {
                fullResponse += String(data)	
              });
            }else{
              client.pause();
            }

        });

        client.on('error', function(ex) {
            console.log(ex.code);
            resolve('error')
//            process.exit(0);
        });

        client.on('close', function() {
            let obj = new Crypto('aes-256-ecb', Buffer.from(key, 'hex'))
            let responseData = obj.decrypt(String(fullResponse.slice(6)))
            //console.log(responseData )
            resolve(responseData)
            //client.destroy();
            console.log('Connection closed');
            //process.exit(0);
        }); 
    })   
}

process.on('message', async (params) => {
    let {branchInfo, productInfo, cashierID, buyerInfo, invoiceNo} = params
    buyerInfo = buyerInfo == "" ? "+8801123657890" : buyerInfo
    let taskID = uuidv4()

    let dt1 = {
                "goodsInfo": [],
                "invoiceNo": invoiceNo,
                "mobile": buyerInfo.length==11?"+88"+buyerInfo:buyerInfo,
                "taskID": taskID
    }

    let cartArrayLoop = productInfo.map(async productInfo => {
                dt1.goodsInfo.push({
                    "code": productInfo.code,
                    "qty": productInfo.quantity.toFixed(2)
                });
            })

            await Promise.all(cartArrayLoop)

            let chCOde = crypto.createHash('sha256').update(JSON.stringify(dt1)).digest("hex")

            let sellData = {
            cashierID: cashierID,
            checkCode: chCOde,
            data: JSON.stringify(dt1),
            type: config.get('nbr_sdc_device').type_return
            }

            for(let i =0; i<branchInfo.nbr_sdc_ips.length; i++){
                // let deviceResopnseInfo = await connectToSDCDevice(branchInfo.nbr_sdc_ips[i], key, sellData)
                let deviceResopnseInfo = await connectToSDCDevice(branchInfo.nbr_sdc_ips[i], key, sellData)
                console.log(deviceResopnseInfo)
                if(deviceResopnseInfo != 'error'){
                    deviceResopnseInfo = JSON.parse(deviceResopnseInfo)
                    if(deviceResopnseInfo.code=="0000"){
                        process.send(deviceResopnseInfo);
                        break;
                    }
                }
        }

        process.send(null);
})
