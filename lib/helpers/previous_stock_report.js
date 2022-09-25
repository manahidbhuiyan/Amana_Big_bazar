var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');
const slugify = require('slugify');
const { fork } = require('child_process')
const config = require('config');
const Branch = require('../../models/Branch');
const CategoryWiseDailyStock = require('../../models/CategoryWiseDailyStock');

let saveCurrentStockReport = async (branchID) => {
    try {
        let condition = {
            branch: {
                $in: branchID
            }
        }

        const child = fork(path.join(__dirname, "..", "..", "routes", "api", "report", "stock", "subprocess", "category_stock_summery.js"));
        const msg = {
            branch: branchID,
            condition,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allCategoryData,
                totalCostAmount,
                totalSellAmount,
                totalQuantity,
                totalGp
            } = response

            let branch = await Branch.findById(branchID).select('_id serialNo name address phone');

            let categoryWiseStockForBranch = new CategoryWiseDailyStock({
                branch: branchID,
                categoryInfo: allCategoryData,
                totalCostAmount,
                totalSellAmount,
                totalQuantity,
                totalGp
            })

            await categoryWiseStockForBranch.save()
        })
        child.on('close', (code) => {
            child.kill()
            console.log(`child process exited with code ${code}`);
        });
    } catch (err) {
        console.error(err);
    }
}

module.exports = saveCurrentStockReport