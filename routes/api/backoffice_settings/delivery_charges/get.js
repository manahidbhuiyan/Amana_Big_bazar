const express = require('express');
const router = express.Router();

const DeliveryCharges = require('../../../../models/DeliveryCharges');

// @route GET api/branch
// @description Get all the branches
// @access Public
router.get('/:pageNo', async (req, res) => {
    try {
        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}

        if (req.query.text !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            condition = {
                [columnName]: {
                    $regex: text,
                    $options: "i"
                }
            }
        }

        let branch = await DeliveryCharges.find(condition).limit(dataList).skip(offset)

        res.status(200).json({
            data: branch
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/branch/:deliveryChargeID
// @description Get single branche
// @access Public
router.get('/data/:deliveryChargeID', async (req, res) => {

    try {
        let deliveryInfo = await DeliveryCharges.findById(req.params.deliveryChargeID)

        res.status(200).json({
            auth: true,
            data: deliveryInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(200).json({
                auth: false,
                msg: 'Delivery charge not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET /api/delivery-charge/change/division
// @description Get all the branches division unique
// @access Public
router.get('/change/division', async (req, res) => {
    try {
        let condition = {}
        if(req.query.branch){
            condition.branch = req.query.branch
        }
        let divisionsOfDeliveryLocation = await DeliveryCharges.find(condition).distinct('division')

        res.status(200).json({
            data: divisionsOfDeliveryLocation
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET /api/delivery-charge/change/:divisionID/district
// @description Get all the district of specific division
// @access Public
router.get('/change/:divisionID/district', async (req, res) => {
    try {
        let divisionID = req.params.divisionID
        let condition = {
            'division.id': divisionID
        }
        if(req.query.branch){
            condition.branch = req.query.branch
        }
        let deliveryLocationDistrict = await DeliveryCharges.find(condition).distinct('district')

        res.status(200).json({
            data: deliveryLocationDistrict
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET /api/delivery-charge/change/:districtID/thana
// @description Get all the thana of specific district
// @access Public
router.get('/change/:districtID/thana', async (req, res) => {
    try {
        let districtID = req.params.districtID
        let condition = {
            'district.id': districtID
        }
        if(req.query.branch){
            condition.branch = req.query.branch
        }
        let thanaOfDeliveryLocation = await DeliveryCharges.find(condition).distinct('thana')

        res.status(200).json({
            data: thanaOfDeliveryLocation
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET /api/delivery-charge/change/:branchID/charge
// @description Get all the Branches of specific thana
// @access Public
router.get('/change/:branchID/charge', async (req, res) => {
    try {
        let branchID = req.params.branchID
        let condition = {
            'branch': branchID
        }
        if(req.query.branch){
            condition.branch = req.query.branch
        }
        let deliveryLocationCharge = await DeliveryCharges.find(condition).select("id serialNo maximum minimum notes division district thana").populate('branch', ['name'])

        res.status(200).json({
            data: deliveryLocationCharge
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router