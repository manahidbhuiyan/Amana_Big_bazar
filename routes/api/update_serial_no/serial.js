const express = require('express');
const router = express.Router();

const Brand = require('../../../models/Tracking/Transaction/ProductVat');

// @route PUT api/supplier
// @description Update single supplier
// @access Private
router.get('/', async (req, res) => {

    try {

        let allBranches = await Brand.find({
            branch: '5f82a8635e989e064902d02e'
        }).select('_id serialNo');
        

        await allBranches.map(async (branchInfo, index)=>{

            branchInfo.serialNo = Number('106'+String(branchInfo.serialNo))
            console.log(branchInfo.serialNo)
            await branchInfo.save()
        })
        
        res.status(200).json({
            msg: 'Branch information updated successfully',
            data: allBranches.length
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid supplier'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router