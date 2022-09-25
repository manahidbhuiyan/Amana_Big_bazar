var crypto = require('crypto');
const config = require('config');
var net = require('net');
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

const connectToSDCDevice = (deviceIP, key, sellData) => {
    return new Promise((resolve, reject)=>{
        var client = new net.Socket();

        client.connect(config.get('nbr_sdc_device').tcp, deviceIP, function() {
            let obj = new Crypto('aes-256-ecb', Buffer.from(key, 'hex'))
        
            let encryptData = obj.encrypt(JSON.stringify(sellData))
    
            encryptData = String(encryptData.length).padStart(6, "0") + encryptData

            console.log('Connected');

            client.write(encryptData);
        });

        client.on('error', function(ex) {
            console.log(ex.code);
            resolve('error')
        });

        client.on('data', function(data) {
            let obj = new Crypto('aes-256-ecb', Buffer.from(key, 'hex'))
            // console.log(obj.decrypt(String(data.slice(6))))
            salesDeviceGetData = 1
            client.destroy(); // kill client after server's response
            resolve(obj.decrypt(String(data.slice(6))))
        });

        client.on('close', function() {
            console.log('Connection closed');
        }); 
    })   
}

const sendSellDataToSDC = (branchInfo, productInfo, cashierID, buyerInfo="") => {
    return new Promise(async(resolve, reject)=>{
        try{
            let taskID = uuidv4()

            let dt1 = {
                "buyerInfo": buyerInfo,
                "currency_code": config.get('nbr_sdc_device').currency_code,
                "goodsInfo": [],
                "payType": "PAYTYPE_CASH",
                "taskID": taskID
            }

            let cartArrayLoop = productInfo.map(async productInfo => {
                let categoryDetails = await Category.findById(productInfo.category).select('nbr_sd_code nbr_vat_code')
                dt1.goodsInfo.push({
                    "code": productInfo.code,
                    "hsCode": "",
                    "item": productInfo.name,
                    "price": String(productInfo.price - productInfo.discount),
                    "qty": productInfo.quantity.toFixed(2),
                    "sd_category": categoryDetails.nbr_sd_code,
                    "vat_category": categoryDetails.nbr_vat_code
                });
            })

            await Promise.all(cartArrayLoop)

            let chCOde = crypto.createHash('sha256').update(JSON.stringify(dt1)).digest("hex")

            let sellData = {
            cashierID: cashierID,
            checkCode: chCOde,
            data: JSON.stringify(dt1),
            type: config.get('nbr_sdc_device').type_sell
            }

            for(let i =0; i<branchInfo.nbr_sdc_ips.length; i++){
                // let deviceResopnseInfo = await connectToSDCDevice(branchInfo.nbr_sdc_ips[i], key, sellData)
                let deviceResopnseInfo = await connectToSDCDevice(branchInfo.nbr_sdc_ips[i], key, sellData)
                if(deviceResopnseInfo != 'error'){
                    deviceResopnseInfo = JSON.parse(deviceResopnseInfo)
                    console.log(deviceResopnseInfo)
                    if(deviceResopnseInfo.code=="0000"){
                        resolve(deviceResopnseInfo)
                        break;
                    }
                }
           }
           resolve(null)
        }catch(e){
            reject(e)
        }
    })
}

const sendReturnDataToSDC = (branchInfo, productInfo, cashierID, buyerInfo="+8801123657890", invoiceNo) => {
    return new Promise(async (resolve, reject)=>{
        try{
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
                        resolve(deviceResopnseInfo)
                        break;
                    }
                }
           }
           resolve(null)
        }catch(e){
            reject(e)
        }
    })
}

module.exports = {
    sendSellDataToSDC,
    sendReturnDataToSDC
}