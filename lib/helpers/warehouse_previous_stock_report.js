var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');
const slugify = require('slugify');
const { fork } = require('child_process')
const config = require('config');
const CategoryWiseDailyStock = require('../../models/CategoryWiseDailyStock');


let saveCurrentWarehouseStockReport = async () => {
    try {
        let condition = {}

        const child = fork(path.join(__dirname, "..", "..", "routes", "api", "report", "warehouse", "stock", "subprocess", "category_stock_summery.js"));

        const msg = {
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

            let categoryWiseStockForBranch = new CategoryWiseDailyStock({
                categoryInfo: allCategoryData,
                totalCostAmount,
                totalSellAmount,
                totalQuantity,
                totalGp
            })

            await categoryWiseStockForBranch.save()

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let today = new Date();
            let hours = today.getHours();
            let minutes = today.getMinutes();
            let ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            let createTime = hours + ':' + minutes + ' ' + ampm;

            let reportFullDataset = {
                title: "summery stock report by category",
                headers: ["Category Code", "Category Name"],
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                branch_id: config.get('warehouse').code,
                branch_phone: config.get('warehouse').phone,
                branch_name: config.get('warehouse').name,
                branch_address: config.get('warehouse').address,
                data: allCategoryData.sort( function (a,b) {
                    return a.name.localeCompare(b.name)
                }),
                totalEarnAmount: totalSellAmount.toFixed(2),
                totalCostAmount: totalCostAmount.toFixed(2),
                totalQuantity: totalQuantity.toFixed(2),
                totalGp: totalGp.toFixed(2)
            }

            var html = fs.readFileSync(path.join(__dirname, '..', '..', 'reports', 'stock', 'current_stock_report_summery.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "portrait",
                border: "10mm",
                header: {
                    height: "8mm",
                    contents: {
                        first: ' ',
                        default: `
                        <table cellspacing=0 cellpadding=0 width="700px" style="margin: 0 auto;"
                        class="table-border">
                        <tr>
                            <th style="font-size: 10px; text-align: left; width: 18% ;padding-left: 3px">Category Code</th>
                            <th style="font-size: 10px; text-align: left; width: 30%">Category Name</th>
                            <th style="font-size: 10px; text-align: right;">Quantity</th>
                            <th style="font-size: 10px; text-align: right;">Cost Amt</th>
                            <th style="font-size: 10px; text-align: right;">Sales Amount</th>
                            <th style="font-size: 10px; text-align: right;">Gp(%)</th>
                        </tr>
                        </table>`
                    }
                },
                footer: {
                    height: "2mm",
                    contents: {
                        default: '<span style="color: #444; text-align: center">page - {{page}} </span>', // fallback value
                    }
                }
            }

            var dd = String(today.getDate()).padStart(2, '0');
            var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
            var yyyy = today.getFullYear();

            var document = {
                html: html,
                data: reportFullDataset,
                path: "./public/stock_reports/warehouse-stock-"+dd + '-' + mm + '-' + yyyy +".pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    console.log(file)
                })
                .catch(error => {
                    console.error(error)
                });
        })
        child.on('close', (code) => {
            child.kill()
            console.log(`child process exited with code ${code}`);
        });
    } catch (err) {
        console.error(err);
    }
}

module.exports = saveCurrentWarehouseStockReport